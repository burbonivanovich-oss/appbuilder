"""httpx wrapper with rate limiting, retries, host-block detection, and JSON cache."""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from typing import Any

import httpx

from . import cache

log = logging.getLogger(__name__)


class HostBlockedError(RuntimeError):
    """Raised when the sandbox network policy refuses the host."""


class UpstreamError(RuntimeError):
    """Non-2xx response from upstream that is not a transient retry candidate."""


@dataclass
class RateLimit:
    min_interval_s: float = 0.0
    _last_call: float = 0.0

    def wait(self) -> None:
        if self.min_interval_s <= 0:
            return
        now = time.monotonic()
        delta = now - self._last_call
        if delta < self.min_interval_s:
            time.sleep(self.min_interval_s - delta)
        self._last_call = time.monotonic()


def _is_host_blocked(resp: httpx.Response) -> bool:
    return resp.status_code == 403 and resp.headers.get("x-deny-reason") == "host_not_allowed"


def get(
    url: str,
    *,
    namespace: str,
    cache_ttl_s: int | None = 86_400,
    headers: dict[str, str] | None = None,
    params: dict[str, Any] | None = None,
    rate_limit: RateLimit | None = None,
    expect_json: bool = False,
    retries: int = 3,
) -> Any:
    """GET with disk cache. Returns parsed JSON if expect_json else text."""
    cache_key = f"GET {url} {params or {}}"
    cached = cache.load(namespace, cache_key, max_age_s=cache_ttl_s)
    if cached is not None:
        return cached

    if rate_limit is not None:
        rate_limit.wait()

    last_exc: Exception | None = None
    for attempt in range(retries):
        try:
            with httpx.Client(timeout=30.0, follow_redirects=True) as client:
                resp = client.get(url, headers=headers, params=params)
            if _is_host_blocked(resp):
                raise HostBlockedError(
                    f"Network policy blocks host for {url}. "
                    f"Recreate the environment with an open-network policy."
                )
            if resp.status_code in (429, 502, 503, 504):
                wait_s = 2 ** attempt
                log.warning("transient %s on %s, retrying in %ds", resp.status_code, url, wait_s)
                time.sleep(wait_s)
                continue
            if resp.status_code >= 400:
                raise UpstreamError(f"{resp.status_code} from {url}: {resp.text[:200]}")
            value: Any = resp.json() if expect_json else resp.text
            cache.save(namespace, cache_key, value)
            return value
        except (httpx.TimeoutException, httpx.NetworkError) as e:
            last_exc = e
            wait_s = 2 ** attempt
            log.warning("network error on %s (%s), retrying in %ds", url, e, wait_s)
            time.sleep(wait_s)

    raise UpstreamError(f"all retries exhausted for {url}: {last_exc}")


def post_json(
    url: str,
    *,
    namespace: str,
    json_body: dict[str, Any],
    cache_ttl_s: int | None = 86_400,
    headers: dict[str, str] | None = None,
    rate_limit: RateLimit | None = None,
    retries: int = 3,
) -> Any:
    """POST JSON (e.g. GraphQL) with disk cache keyed on body."""
    cache_key = f"POST {url} {json_body}"
    cached = cache.load(namespace, cache_key, max_age_s=cache_ttl_s)
    if cached is not None:
        return cached

    if rate_limit is not None:
        rate_limit.wait()

    last_exc: Exception | None = None
    for attempt in range(retries):
        try:
            with httpx.Client(timeout=30.0, follow_redirects=True) as client:
                resp = client.post(url, headers=headers, json=json_body)
            if _is_host_blocked(resp):
                raise HostBlockedError(
                    f"Network policy blocks host for {url}. "
                    f"Recreate the environment with an open-network policy."
                )
            if resp.status_code in (429, 502, 503, 504):
                time.sleep(2 ** attempt)
                continue
            if resp.status_code >= 400:
                raise UpstreamError(f"{resp.status_code} from {url}: {resp.text[:200]}")
            value = resp.json()
            cache.save(namespace, cache_key, value)
            return value
        except (httpx.TimeoutException, httpx.NetworkError) as e:
            last_exc = e
            time.sleep(2 ** attempt)

    raise UpstreamError(f"all retries exhausted for {url}: {last_exc}")
