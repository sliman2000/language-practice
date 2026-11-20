import { startRuntime, expect } from '/home/user/oss-new/control/runtime/index.mjs';
import { authorCourse, choose, SPANISH, VOCAB } from './helpers.mjs';

const runtime = await startRuntime();
try {
  const owner = await (await runtime.context('owner')).newPage();
  const member = await (await runtime.context('member')).newPage();

  // F001: an admin authors and publishes courses; a draft stays hidden.
  const courseId = await authorCourse(owner, SPANISH);
  await authorCourse(owner, { title: 'French Conversation', language: 'French', level: 'B1', publish: true });
  await authorCourse(owner, { title: 'German Basics', language: 'German', level: 'A1', publish: false });

  await member.goto('/courses');
  const cards = member.getByTestId('course-card');
  await expect(cards).toHaveCount(2);
  await expect(member.getByText('German Basics')).toHaveCount(0);
  await choose(member, 'filter-language', 'Spanish');
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText('Everyday Spanish');
  await expect(cards.first()).toContainText('A1');
  await choose(member, 'filter-language', 'All languages');
  await choose(member, 'filter-level', 'B1');
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText('French Conversation');

  // F001: outline with completion state, and enrolment (several courses at once).
  await owner.goto(`/courses/${courseId}`);
  await expect(owner.getByRole('heading', { name: 'Everyday Spanish' })).toBeVisible();
  const greetingsRow = owner.getByTestId('lesson-row').filter({ hasText: 'Greetings' });
  await expect(greetingsRow).toContainText('Not started');
  await owner.getByRole('button', { name: 'Enrol' }).click();
  await expect(owner.getByTestId('course-progress')).toContainText('0 of 2 lessons');
  await owner.goto('/courses');
  await owner.getByTestId('course-card').filter({ hasText: 'French Conversation' }).getByRole('link').first().click();
  await owner.getByRole('button', { name: 'Enrol' }).click();
  await expect(owner.getByTestId('enrolled')).toBeVisible();
  await owner.goto('/');
  await expect(owner.getByTestId('my-course')).toHaveCount(2);

  // F002: the lesson player, one exercise at a time with feedback.
  await owner.goto(`/courses/${courseId}`);
  await owner.getByTestId('lesson-row').filter({ hasText: 'Greetings' }).getByRole('link').click();
  await expect(owner.getByTestId('step')).toHaveText('1 of 5');
  await expect(owner.getByTestId('exercise-prompt')).toContainText('good morning');
  await owner.getByTestId('choice').filter({ hasText: 'Buenas noches' }).click();
  await owner.getByRole('button', { name: 'Check' }).click();
  await expect(owner.getByTestId('feedback')).toContainText('Incorrect');
  await expect(owner.getByTestId('feedback')).toContainText('Buenos días');
  await owner.getByRole('button', { name: 'Next' }).click();

  await expect(owner.getByTestId('step')).toHaveText('2 of 5');
  await owner.getByTestId('answer-input').fill('  GRACIAS ');
  await owner.getByRole('button', { name: 'Check' }).click();
  await expect(owner.getByTestId('feedback')).toContainText('Correct');
  await owner.getByRole('button', { name: 'Next' }).click();

  await owner.getByTestId('answer-input').fill('llamo');
  await owner.getByRole('button', { name: 'Check' }).click();
  await expect(owner.getByTestId('feedback')).toContainText('Correct');
  await owner.getByRole('button', { name: 'Next' }).click();

  await expect(owner.getByTestId('exercise-prompt')).toContainText('introducing yourself');
  await owner.getByTestId('submission-text').fill('Hola, me llamo Ana. Vivo en Madrid y trabajo en un hospital.');
  await owner.getByRole('button', { name: 'Send for feedback' }).click();
  await expect(owner.getByTestId('feedback')).toContainText('Sent for feedback');
  await owner.getByRole('button', { name: 'Next' }).click();

  await expect(owner.getByTestId('exercise-prompt')).toContainText('where you live');
  await owner.getByRole('button', { name: 'Skip' }).click();

  await expect(owner.getByTestId('lesson-result')).toContainText('2 of 3 correct');
  await expect(owner.getByTestId('lesson-result')).toContainText('Lesson complete');
  await owner.getByRole('button', { name: 'Retake' }).click();
  await expect(owner.getByTestId('step')).toHaveText('1 of 5');

  await owner.goto(`/courses/${courseId}`);
  await expect(owner.getByTestId('lesson-row').filter({ hasText: 'Greetings' })).toContainText('Completed');
  await expect(owner.getByTestId('course-progress')).toContainText('1 of 2 lessons');
  await expect(owner.getByTestId('course-progress')).toContainText('50%');

  // F003: completed lesson's words are due; a session grades and reschedules them.
  await owner.goto('/review');
  await expect(owner.getByTestId('due-count')).toHaveText('3');
  const weak = owner.getByTestId('group-weak');
  for (const word of ['hola', 'gracias', 'adiós']) await expect(weak).toContainText(word);
  await expect(owner.getByText('la cuenta')).toHaveCount(0);
  await owner.getByRole('link', { name: 'Start review' }).click();
  for (let i = 0; i < 3; i += 1) {
    const term = (await owner.getByTestId('review-term').innerText()).trim();
    await owner.getByTestId('review-answer').fill(term === 'adiós' ? 'see you' : VOCAB[term].toUpperCase());
    await owner.getByRole('button', { name: 'Check' }).click();
    await expect(owner.getByTestId('feedback')).toContainText(term === 'adiós' ? 'Incorrect' : 'Correct');
    await owner.getByRole('button', { name: i === 2 ? 'Finish' : 'Next' }).click();
  }
  await expect(owner.getByTestId('review-summary')).toContainText('2 correct');
  await expect(owner.getByTestId('review-summary')).toContainText('1 incorrect');
  await owner.goto('/review');
  await expect(owner.getByTestId('due-count')).toHaveText('1');
  await expect(owner.getByTestId('group-medium')).toContainText('hola');
  await expect(owner.getByTestId('group-weak')).toContainText('adiós');
  const db = await runtime.database();
  const rows = (await db.prepare(
    "select v.term, r.strength, r.due_at from review_items r join vocab_items v on v.id = r.vocab_item_id",
  ).all()).results;
  const byTerm = Object.fromEntries(rows.map((r) => [r.term, r]));
  expect(byTerm.hola.strength).toBe(1);
  expect(byTerm['adiós'].strength).toBe(0);
  expect(new Date(byTerm.hola.due_at).getTime()).toBeGreaterThan(Date.now() + 12 * 3600 * 1000);

  // F004: the study plan with week target, streak, lessons left and finish date.
  await owner.goto('/plan');
  await choose(owner, 'plan-course', 'Everyday Spanish');
  await choose(owner, 'plan-level', 'A2');
  await owner.getByTestId('plan-days').fill('3');
  await owner.getByTestId('plan-minutes').fill('20');
  await owner.getByRole('button', { name: 'Save plan' }).click();
  await expect(owner.getByTestId('plan-week')).toContainText('1 of 3');
  await expect(owner.getByTestId('plan-streak')).toContainText('1 day');
  await expect(owner.getByTestId('plan-remaining')).toContainText('1');
  await expect(owner.getByTestId('plan-finish')).not.toBeEmpty();
  await owner.getByRole('button', { name: 'Edit plan' }).click();
  await owner.getByTestId('plan-days').fill('5');
  await owner.getByRole('button', { name: 'Save plan' }).click();
  await expect(owner.getByTestId('plan-week')).toContainText('1 of 5');

  // F005: a member who knows the language corrects; the author sees and rates.
  await member.goto('/community');
  await expect(member.getByTestId('to-correct-item')).toHaveCount(0);
  await member.goto('/profile');
  await choose(member, 'profile-native', 'English');
  await member.getByTestId('known-language').filter({ hasText: 'Spanish' }).click();
  await member.getByRole('button', { name: 'Save' }).click();
  await expect(member.getByText('Saved')).toBeVisible();
  await member.goto('/community');
  const item = member.getByTestId('to-correct-item');
  await expect(item).toHaveCount(1);
  await expect(item).toContainText('Vivo en Madrid');
  await item.getByRole('link').click();
  await member.getByTestId('correction-text').fill('Hola, me llamo Ana. Vivo en Madrid y trabajo en un hospital del centro.');
  await member.getByTestId('correction-comment').fill('Very natural! You could add where the hospital is.');
  await member.getByRole('button', { name: 'Send correction' }).click();
  await expect(member.getByTestId('correction')).toContainText('del centro');
  await member.goto('/community');
  await expect(member.getByTestId('given-count')).toHaveText('1');

  // Speaking: a recorded clip goes up through the recordings route.
  const speaking = await db.prepare("select id from exercises where type = 'speaking'").first();
  const upload = await runtime.fetch(`/api/recordings?exerciseId=${speaking.id}`, {
    role: 'owner', method: 'POST', headers: { 'content-type': 'audio/webm' },
    body: new Uint8Array([26, 69, 223, 163, 1, 2, 3, 4]),
  });
  expect(upload.status).toBe(201);
  const { id: recordingId } = await upload.json();
  const clip = await runtime.fetch(`/api/recordings/${recordingId}`, { role: 'owner' });
  expect(clip.status).toBe(200);
  expect(clip.headers.get('content-type')).toContain('audio/webm');
  expect((await clip.arrayBuffer()).byteLength).toBe(8);

  await owner.goto('/community');
  await expect(owner.getByTestId('received-count')).toHaveText('1');
  await owner.getByRole('tab', { name: 'My submissions' }).click();
  await expect(owner.getByTestId('my-submission')).toHaveCount(2);
  await owner.getByTestId('my-submission').filter({ hasText: 'Vivo en Madrid' }).getByRole('link').click();
  const correction = owner.getByTestId('correction');
  await expect(correction).toContainText('del centro');
  await expect(correction).toContainText('Very natural!');
  await correction.getByRole('button', { name: 'Rate 5' }).click();
  await expect(correction.getByTestId('rating')).toHaveText('5/5');

  // The journey ends on the course the owner is studying.
  await owner.goto(`/courses/${courseId}`);
  await runtime.assertBackLink(owner);
  await expect(owner.getByTestId('course-progress')).toContainText('50%');
  await runtime.screenshot(owner);

  // Phone-sized smoke.
  const phone = await (await runtime.context('member', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
  await phone.goto('/courses');
  await expect(phone.getByRole('heading', { name: 'Courses' })).toBeVisible();
  await expect(phone.getByTestId('course-card').first()).toBeVisible();
  const width = await phone.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(390);
} finally {
  await runtime.close();
}
