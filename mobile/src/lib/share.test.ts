import { buildShareText } from './share';
import { computeLeapStates, getTodaySnapshot } from './leaps';
import { addWeeks, addDays } from './date';

describe('buildShareText', () => {
  const due = new Date(2024, 0, 1);

  it('active leap: includes child name, leap number, and reassuring tip', () => {
    const now = addWeeks(due, 12); // active leap 3
    const snapshot = getTodaySnapshot(computeLeapStates(due, now));
    const result = buildShareText({ childName: 'Лёва', snapshot });
    expect(result).not.toBeNull();
    expect(result!.title).toMatch(/Скачок 3.*Лёва/);
    expect(result!.message).toMatch(/Лёва/);
    expect(result!.message).toMatch(/скачок 3/);
    expect(result!.message).toMatch(/Будьте рядом|обнимайте|размеренный/);
  });

  it('pre-leap: mentions days until and prep tip', () => {
    const leap3Start = addWeeks(addWeeks(due, 12), -1);
    const now = addDays(leap3Start, -3);
    const snapshot = getTodaySnapshot(computeLeapStates(due, now));
    const result = buildShareText({ childName: 'Лёва', snapshot });
    expect(result).not.toBeNull();
    expect(result!.title).toMatch(/скоро/);
    expect(result!.message).toMatch(/возможно скоро начнётся/);
    expect(result!.message).toMatch(/Можно готовиться/);
  });

  it('calm with next leap: mentions weeks to next', () => {
    const now = addWeeks(due, 30); // between leap 5 and 6
    const snapshot = getTodaySnapshot(computeLeapStates(due, now));
    const result = buildShareText({ childName: 'Лёва', snapshot });
    expect(result).not.toBeNull();
    expect(result!.message).toMatch(/спокойный период/);
    expect(result!.message).toMatch(/До следующего скачка/);
  });

  it('all-done: celebratory tone', () => {
    const now = addWeeks(due, 200);
    const snapshot = getTodaySnapshot(computeLeapStates(due, now));
    const result = buildShareText({ childName: 'Лёва', snapshot });
    expect(result).not.toBeNull();
    expect(result!.message).toMatch(/10 скачков позади/);
  });

  it('does not contain alarming words', () => {
    const now = addWeeks(due, 12);
    const snapshot = getTodaySnapshot(computeLeapStates(due, now));
    const result = buildShareText({ childName: 'Стас', snapshot });
    expect(result).not.toBeNull();
    const message = result!.message.toLowerCase();
    expect(message).not.toMatch(/срочно|опасно|тревога|симптомы|должн/);
  });
});
