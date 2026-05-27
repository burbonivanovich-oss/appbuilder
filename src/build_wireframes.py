"""Generate mock-screenshots of Dopamine fasting key screens.

Renders 6 iPhone-sized 'wireframes' (one composite PNG) showing what each
screen looks like at MVP. Not pixel-perfect Figma — but communicative enough
for an iOS dev to verify their implementation against.
"""
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Rectangle
import matplotlib.patheffects as pe

OUT = Path(__file__).resolve().parent.parent / "output" / "wireframes_dopamine.png"

# iPhone-ish proportions
W, H = 380, 800
PAD = 16

# Colors
BG = "#FFFFFF"
BG_DARK = "#FAFAFA"
TEXT_PRIMARY = "#000000"
TEXT_SECONDARY = "#666666"
ORANGE_1 = "#FF6B3D"
ORANGE_2 = "#FF4520"
ACCENT = "#FF6B35"
CARD_BG = "#F2F2F7"
TAB_BG = "#FFFFFF"
DIVIDER = "#E5E5EA"


def draw_phone_frame(ax):
    """Outer phone outline."""
    ax.set_xlim(-20, W + 20)
    ax.set_ylim(-20, H + 20)
    ax.set_aspect("equal")
    ax.axis("off")
    # phone
    ax.add_patch(FancyBboxPatch((0, 0), W, H, boxstyle="round,pad=0,rounding_size=24",
                                 ec="#222", fc=BG, lw=1.5))
    # notch / dynamic island
    ax.add_patch(FancyBboxPatch((W/2 - 50, H - 28), 100, 18,
                                 boxstyle="round,pad=0,rounding_size=9",
                                 fc="#000", ec="#000"))
    # status bar fake
    ax.text(28, H - 18, "9:41", fontsize=11, fontweight="bold", color="#000")
    ax.text(W - 30, H - 18, "100%", fontsize=8, color="#000", ha="right")


def icon_box(ax, x, y, size, fill=CARD_BG):
    """Placeholder box for app icon (substitute for emoji)."""
    ax.add_patch(FancyBboxPatch((x, y), size, size,
                                 boxstyle="round,pad=0,rounding_size=6",
                                 fc=fill, ec=TEXT_SECONDARY, lw=0.5))


def draw_today_screen(ax):
    """Screen 1: Today / Home"""
    draw_phone_frame(ax)
    ax.set_title("1. Today (Home)", fontsize=11, fontweight="bold", pad=6, loc="left")

    # title bar
    y = H - 56
    ax.text(PAD, y, "HardMode", fontsize=22, fontweight="bold", color=TEXT_PRIMARY)
    # settings icon as box
    icon_box(ax, W - PAD - 24, y - 6, 24, fill="none")
    ax.text(W - PAD - 12, y + 4, "⚙", fontsize=14, ha="center", va="center", color=TEXT_SECONDARY)

    # Streak Hero
    hero_y = H - 280
    ax.add_patch(FancyBboxPatch((PAD, hero_y), W - 2 * PAD, 180,
                                 boxstyle="round,pad=0,rounding_size=20",
                                 fc=ORANGE_1, ec="none"))
    # Flame placeholder
    ax.text(W / 2, hero_y + 138, "[flame]", fontsize=14, ha="center", color="white", alpha=0.85,
            style="italic")
    ax.text(W / 2, hero_y + 78, "12", fontsize=58, fontweight="bold",
            ha="center", color="white")
    ax.text(W / 2, hero_y + 32, "day streak", fontsize=14, ha="center", color="white", alpha=0.95)
    ax.text(W - PAD - 8, hero_y + 8, "Best: 34", fontsize=10, ha="right", color="white", alpha=0.75)

    # NOW BLOCKED section
    sect_y = hero_y - 36
    ax.text(PAD, sect_y, "NOW BLOCKED", fontsize=10, fontweight="bold",
            color=TEXT_SECONDARY)

    # blocked card 1 (Instagram)
    card1_y = sect_y - 70
    ax.add_patch(FancyBboxPatch((PAD, card1_y), W - 2 * PAD, 60,
                                 boxstyle="round,pad=0,rounding_size=12",
                                 fc=CARD_BG, ec="none"))
    icon_box(ax, PAD + 12, card1_y + 16, 28, fill="#FBD3D8")
    ax.text(PAD + 26, card1_y + 30, "IG", fontsize=10, ha="center", va="center", fontweight="bold")
    ax.text(PAD + 52, card1_y + 38, "Instagram", fontsize=13, fontweight="bold")
    ax.text(PAD + 52, card1_y + 18, "Unblocks in 4h 23m", fontsize=10, color=TEXT_SECONDARY)
    # HARD badge
    ax.add_patch(FancyBboxPatch((W - PAD - 50, card1_y + 22), 40, 18,
                                 boxstyle="round,pad=0,rounding_size=9",
                                 fc=ACCENT, ec="none"))
    ax.text(W - PAD - 30, card1_y + 31, "HARD", fontsize=8, color="white",
            ha="center", va="center", fontweight="bold")

    # blocked card 2 (Reddit)
    card2_y = card1_y - 68
    ax.add_patch(FancyBboxPatch((PAD, card2_y), W - 2 * PAD, 60,
                                 boxstyle="round,pad=0,rounding_size=12",
                                 fc=CARD_BG, ec="none"))
    icon_box(ax, PAD + 12, card2_y + 16, 28, fill="#FFE4D6")
    ax.text(PAD + 26, card2_y + 30, "R", fontsize=12, ha="center", va="center", fontweight="bold")
    ax.text(PAD + 52, card2_y + 38, "Reddit", fontsize=13, fontweight="bold")
    ax.text(PAD + 52, card2_y + 18, "Until tomorrow 7:00 AM", fontsize=10, color=TEXT_SECONDARY)

    # QUICK MODES
    qmsect_y = card2_y - 36
    ax.text(PAD, qmsect_y, "QUICK MODES", fontsize=10, fontweight="bold", color=TEXT_SECONDARY)

    # 3 buttons
    btn_w = (W - 2 * PAD - 16) / 3
    btn_y = qmsect_y - 88
    for i, (label, sub) in enumerate([
        ("Focus", "45 min"),
        ("Sabbath", "24 hours"),
        ("Sleep", "22-7 AM"),
    ]):
        x = PAD + i * (btn_w + 8)
        ax.add_patch(FancyBboxPatch((x, btn_y), btn_w, 78,
                                     boxstyle="round,pad=0,rounding_size=14",
                                     fc=CARD_BG, ec="none"))
        # icon placeholder
        ax.add_patch(plt.Circle((x + btn_w / 2, btn_y + 56), 12,
                                 fc="none", ec=TEXT_SECONDARY, lw=1))
        ax.text(x + btn_w / 2, btn_y + 30, label, fontsize=11, fontweight="bold", ha="center")
        ax.text(x + btn_w / 2, btn_y + 14, sub, fontsize=9, color=TEXT_SECONDARY, ha="center")

    # tab bar
    tab_h = 60
    ax.add_patch(Rectangle((0, 0), W, tab_h, fc=TAB_BG, ec="none"))
    ax.add_patch(Rectangle((0, tab_h - 1), W, 1, fc=DIVIDER, ec="none"))
    tab_w = W / 4
    tabs = [("Today", True), ("Rules", False), ("Stats", False), ("Settings", False)]
    for i, (label, active) in enumerate(tabs):
        x = i * tab_w + tab_w / 2
        color = ACCENT if active else TEXT_SECONDARY
        # icon placeholder = small circle
        ax.add_patch(plt.Circle((x, 40), 7, fc="none", ec=color, lw=1.2))
        ax.text(x, 18, label, fontsize=9, ha="center", color=color,
                fontweight="bold" if active else "normal")


def draw_onboarding_screen(ax):
    """Screen 2: Onboarding step 4 — choose pattern"""
    draw_phone_frame(ax)
    ax.set_title("2. Onboarding (step 4 of 7)", fontsize=11, fontweight="bold", pad=6, loc="left")

    # progress dots
    y = H - 60
    for i in range(7):
        cx = 40 + i * 42
        fc = ACCENT if i < 4 else "#D0D0D0"
        ax.add_patch(FancyBboxPatch((cx, y), 32, 4,
                                     boxstyle="round,pad=0,rounding_size=2",
                                     fc=fc, ec="none"))

    # heading
    ax.text(PAD, H - 130, "Choose your\npattern", fontsize=26,
            fontweight="bold", color=TEXT_PRIMARY)
    ax.text(PAD, H - 200, "How strict do you want to be?",
            fontsize=14, color=TEXT_SECONDARY)

    # 3 radio options
    options = [
        ("Schoolkid", "Block during work hours (9-6 weekdays). Easy.", False),
        ("Hardcore", "24/7 block until you say otherwise. Hard mode.", True),
        ("Context", "Block based on location and time. Smart.", False),
    ]
    start_y = H - 260
    for i, (title, desc, selected) in enumerate(options):
        oy = start_y - i * 100
        # card
        fc = ORANGE_1 if selected else CARD_BG
        ax.add_patch(FancyBboxPatch((PAD, oy - 80), W - 2 * PAD, 84,
                                     boxstyle="round,pad=0,rounding_size=14",
                                     fc=fc, ec="none"))
        # radio circle
        rx, ry = PAD + 20, oy - 36
        circle_fc = "white" if selected else "#D0D0D0"
        ax.add_patch(plt.Circle((rx, ry), 10, fc=circle_fc, ec="none"))
        if selected:
            ax.add_patch(plt.Circle((rx, ry), 5, fc=ACCENT, ec="none"))
        # text
        text_color = "white" if selected else TEXT_PRIMARY
        sub_color = "white" if selected else TEXT_SECONDARY
        ax.text(rx + 24, oy - 24, title, fontsize=15, fontweight="bold", color=text_color)
        ax.text(rx + 24, oy - 48, desc, fontsize=11, color=sub_color, wrap=True)

    # continue button
    btn_y = 100
    ax.add_patch(FancyBboxPatch((PAD, btn_y), W - 2 * PAD, 50,
                                 boxstyle="round,pad=0,rounding_size=12",
                                 fc=ORANGE_2, ec="none"))
    ax.text(W / 2, btn_y + 25, "Continue", fontsize=16,
            fontweight="bold", color="white", ha="center", va="center")


def draw_rules_editor(ax):
    """Screen 3: Rule editor"""
    draw_phone_frame(ax)
    ax.set_title("3. Rules (list)", fontsize=11, fontweight="bold", pad=6, loc="left")

    # title bar
    y = H - 56
    ax.text(PAD, y, "Rules", fontsize=22, fontweight="bold")
    ax.text(W - PAD, y, "+", fontsize=24, ha="right", color=ACCENT, fontweight="bold")

    # 3 rules
    rules = [
        ("Block social during work", "Mon-Fri 9-18 · Instagram, Reddit, TikTok, X", True, True),
        ("Sabbath block", "Saturday 0-23 · all socials + news apps", True, True),
        ("Spotify only at gym", "Geo-trigger · Spotify works in gym, blocked elsewhere", True, False),
        ("Reddit at home only", "Geo-trigger · Reddit only at home address", False, False),
    ]
    start_y = H - 130
    for i, (title, sub, enabled, hard) in enumerate(rules):
        cy = start_y - i * 100
        ax.add_patch(FancyBboxPatch((PAD, cy - 80), W - 2 * PAD, 84,
                                     boxstyle="round,pad=0,rounding_size=14",
                                     fc=CARD_BG, ec="none"))
        ax.text(PAD + 14, cy - 28, title, fontsize=13, fontweight="bold")
        ax.text(PAD + 14, cy - 50, sub, fontsize=10, color=TEXT_SECONDARY)
        # toggle
        toggle_x = W - PAD - 48
        ty = cy - 42
        toggle_fc = ACCENT if enabled else "#D0D0D0"
        ax.add_patch(FancyBboxPatch((toggle_x, ty), 36, 22,
                                     boxstyle="round,pad=0,rounding_size=11",
                                     fc=toggle_fc, ec="none"))
        knob_x = toggle_x + 18 if enabled else toggle_x + 2
        ax.add_patch(plt.Circle((knob_x + 9, ty + 11), 9, fc="white", ec="none"))
        # HARD badge
        if hard:
            ax.add_patch(FancyBboxPatch((W - PAD - 52, cy - 68), 38, 16,
                                         boxstyle="round,pad=0,rounding_size=8",
                                         fc=ACCENT, ec="none"))
            ax.text(W - PAD - 33, cy - 60, "HARD", fontsize=7,
                    color="white", ha="center", fontweight="bold")


def draw_unlock_request(ax):
    """Screen 4: Unlock request flow (hard mode 24h cooldown)"""
    draw_phone_frame(ax)
    ax.set_title("4. Unlock Request (hard mode)", fontsize=11, fontweight="bold", pad=6, loc="left")

    # close button area
    ax.text(W - PAD, H - 50, "X", fontsize=14, ha="right", color=TEXT_SECONDARY, fontweight="bold")

    # heading + icon (placeholder lock circle)
    ax.add_patch(plt.Circle((W / 2, H - 140), 36, fc=ORANGE_1, ec="none"))
    ax.text(W / 2, H - 140, "LOCK", fontsize=14, ha="center", va="center",
            color="white", fontweight="bold")
    ax.text(W / 2, H - 220, "Are you sure?", fontsize=24,
            fontweight="bold", ha="center")

    # explanation
    msg = ("Unlock will be available\nin 24 hours.\n\nMost people don't actually\nwant this when 24h passes.")
    ax.text(W / 2, H - 340, msg, fontsize=13, color=TEXT_SECONDARY,
            ha="center", va="top", linespacing=1.6)

    # confirm button
    btn_y = 240
    ax.add_patch(FancyBboxPatch((PAD, btn_y), W - 2 * PAD, 52,
                                 boxstyle="round,pad=0,rounding_size=12",
                                 fc=ORANGE_2, ec="none"))
    ax.text(W / 2, btn_y + 26, "Request unlock", fontsize=15,
            fontweight="bold", color="white", ha="center", va="center")

    # cancel
    cancel_y = btn_y - 64
    ax.add_patch(FancyBboxPatch((PAD, cancel_y), W - 2 * PAD, 52,
                                 boxstyle="round,pad=0,rounding_size=12",
                                 fc="none", ec=TEXT_SECONDARY, lw=1))
    ax.text(W / 2, cancel_y + 26, "Cancel", fontsize=15,
            color=TEXT_SECONDARY, ha="center", va="center")

    # tip below
    ax.text(W / 2, cancel_y - 36,
            "TIP: 84% of unlock requests are cancelled\nbefore the 24h ends.",
            fontsize=10, color=TEXT_SECONDARY, ha="center", linespacing=1.5, style="italic")


def draw_stats_screen(ax):
    """Screen 5: Stats with heatmap"""
    draw_phone_frame(ax)
    ax.set_title("5. Stats", fontsize=11, fontweight="bold", pad=6, loc="left")

    ax.text(PAD, H - 56, "Stats", fontsize=22, fontweight="bold")

    # current streak
    ax.text(PAD, H - 110, "12 days", fontsize=22, fontweight="bold", color=ORANGE_2)
    ax.text(PAD, H - 134, "current streak", fontsize=11, color=TEXT_SECONDARY)

    # heatmap (12 weeks × 7 days)
    import random
    random.seed(2)
    hm_y = H - 320
    cell = 22
    spacing = 3
    ax.text(PAD, hm_y + 130, "Last 12 weeks", fontsize=12, fontweight="bold")
    for week in range(12):
        for day in range(7):
            x = PAD + week * (cell + spacing)
            y = hm_y - day * (cell + spacing) + 90
            # darker = better streak day
            r = random.random()
            if r < 0.15:
                fc = "#EEE"  # broken day
            elif r < 0.5:
                fc = "#FFD2BA"  # light
            elif r < 0.8:
                fc = "#FF8E60"
            else:
                fc = ORANGE_2  # solid streak day
            ax.add_patch(FancyBboxPatch((x, y), cell, cell,
                                         boxstyle="round,pad=0,rounding_size=4",
                                         fc=fc, ec="none"))

    # stats summary
    stat_y = hm_y - 80
    stats = [
        ("Best streak", "34 days"),
        ("Total clean", "127 days"),
        ("Time saved (est.)", "~84 hours"),
        ("Blocks tried", "3,402 times"),
    ]
    for i, (label, val) in enumerate(stats):
        sy = stat_y - i * 50
        ax.text(PAD, sy, label, fontsize=12, color=TEXT_SECONDARY)
        ax.text(W - PAD, sy, val, fontsize=13, fontweight="bold", ha="right")

    # share button
    share_y = 120
    ax.add_patch(FancyBboxPatch((PAD, share_y), W - 2 * PAD, 48,
                                 boxstyle="round,pad=0,rounding_size=12",
                                 fc=ORANGE_2, ec="none"))
    ax.text(W / 2, share_y + 24, "Share my streak", fontsize=14,
            fontweight="bold", color="white", ha="center", va="center")


def draw_share_card(ax):
    """Screen 6: Share streak card (the generated image)"""
    draw_phone_frame(ax)
    ax.set_title("6. Share card (auto-generated)", fontsize=11, fontweight="bold", pad=6, loc="left")

    # full-screen gradient
    ax.add_patch(FancyBboxPatch((PAD, 120), W - 2 * PAD, H - 200,
                                 boxstyle="round,pad=0,rounding_size=20",
                                 fc=ORANGE_1, ec="none"))

    # streak
    ax.add_patch(plt.Circle((W / 2, H - 240), 38, fc="none", ec="white", lw=3))
    ax.text(W / 2, H - 240, "12", fontsize=44, ha="center", va="center",
            color="white", fontweight="bold")
    ax.text(W / 2, H - 320, "12", fontsize=110, fontweight="bold",
            ha="center", color="white", alpha=0.95)
    ax.text(W / 2, H - 400, "day streak", fontsize=22, ha="center", color="white")
    ax.text(W / 2, H - 440, "of HardMode", fontsize=14, ha="center", color="white", alpha=0.8)

    # subtitle
    ax.text(W / 2, H - 540, "Blocking Instagram & Reddit\nduring work hours",
            fontsize=12, ha="center", color="white", alpha=0.85, linespacing=1.5)

    # brand
    ax.text(W / 2, 180, "hardmode.app", fontsize=11, ha="center", color="white", alpha=0.7)

    # share buttons below
    share_y = 80
    ax.text(PAD, share_y, "Twitter / X", fontsize=11, color=TEXT_SECONDARY)
    ax.text(W / 2, share_y, "Instagram", fontsize=11, ha="center", color=TEXT_SECONDARY)
    ax.text(W - PAD, share_y, "Save", fontsize=11, ha="right", color=TEXT_SECONDARY)


def main():
    fig, axes = plt.subplots(2, 3, figsize=(15, 16))
    draw_today_screen(axes[0, 0])
    draw_onboarding_screen(axes[0, 1])
    draw_rules_editor(axes[0, 2])
    draw_unlock_request(axes[1, 0])
    draw_stats_screen(axes[1, 1])
    draw_share_card(axes[1, 2])

    fig.suptitle("Dopamine fasting (HardMode) — MVP wireframes",
                 fontsize=16, fontweight="bold", y=0.995)
    fig.tight_layout(rect=[0, 0, 1, 0.98])
    fig.savefig(OUT, dpi=130, bbox_inches="tight", facecolor="#F5F5F5")
    plt.close(fig)
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
