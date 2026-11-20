import { startRuntime, expect } from '/home/user/oss-new/control/runtime/index.mjs';
import { authorCourse, choose, SPANISH } from './helpers.mjs';

const runtime = await startRuntime();
try {
  await runtime.assertPrivateAccess(['/', '/courses', '/review', '/plan', '/community', '/profile']);

  // No public routes: anonymous and outsider are refused on the recordings route too.
  for (const role of [undefined, 'outsider']) {
    const res = await runtime.fetch('/api/recordings?exerciseId=x', { role, method: 'POST', body: 'x' });
    expect([401, 403]).toContain(res.status);
  }

  // The app has no sign-in page of its own.
  for (const path of ['/login', '/signin', '/sign-in', '/signup', '/register']) {
    const res = await runtime.fetch(path, { role: 'member' });
    expect(res.status).toBe(404);
    expect(await res.text()).not.toMatch(/type="password"/);
  }

  const owner = await (await runtime.context('owner')).newPage();
  const member = await (await runtime.context('member')).newPage();

  const courseId = await authorCourse(owner, SPANISH);
  const draftId = await authorCourse(owner, { title: 'German Basics', language: 'German', level: 'A1', publish: false });

  // Admin-only authoring refuses a member.
  await member.goto('/admin');
  await expect(member.getByTestId('not-admin')).toBeVisible();
  await expect(member.getByTestId('course-title')).toHaveCount(0);
  await member.goto(`/admin/courses/${courseId}`);
  await expect(member.getByTestId('not-admin')).toBeVisible();
  await expect(member.getByRole('button', { name: 'Publish' })).toHaveCount(0);
  await expect(member.getByRole('button', { name: 'Unpublish' })).toHaveCount(0);
  await member.goto('/courses');
  await expect(member.getByRole('link', { name: 'Admin' })).toHaveCount(0);

  // Drafts are invisible to members.
  await expect(member.getByText('German Basics')).toHaveCount(0);
  await member.goto(`/courses/${draftId}`);
  await expect(member.getByTestId('not-found')).toBeVisible();
  await expect(member.getByText('German Basics')).toHaveCount(0);

  // Owner studies and submits; member's own records stay separate.
  await owner.goto(`/courses/${courseId}`);
  await owner.getByRole('button', { name: 'Enrol' }).click();
  await owner.getByTestId('lesson-row').filter({ hasText: 'Greetings' }).getByRole('link').click();
  for (let i = 0; i < 3; i += 1) {
    if (i === 0) await owner.getByTestId('choice').filter({ hasText: 'Buenos días' }).click();
    else await owner.getByTestId('answer-input').fill(i === 1 ? 'gracias' : 'llamo');
    await owner.getByRole('button', { name: 'Check' }).click();
    await owner.getByRole('button', { name: 'Next' }).click();
  }
  await owner.getByTestId('submission-text').fill('Me llamo Ana y vivo en Sevilla.');
  await owner.getByRole('button', { name: 'Send for feedback' }).click();
  await owner.getByRole('button', { name: 'Next' }).click();
  await owner.getByRole('button', { name: 'Skip' }).click();
  await expect(owner.getByTestId('lesson-result')).toContainText('3 of 3 correct');

  await owner.goto('/plan');
  await choose(owner, 'plan-course', 'Everyday Spanish');
  await choose(owner, 'plan-level', 'A2');
  await owner.getByTestId('plan-days').fill('4');
  await owner.getByTestId('plan-minutes').fill('15');
  await owner.getByRole('button', { name: 'Save plan' }).click();
  await expect(owner.getByTestId('plan-week')).toBeVisible();

  await member.goto(`/courses/${courseId}`);
  await expect(member.getByTestId('lesson-row').filter({ hasText: 'Greetings' })).toContainText('Not started');
  await expect(member.getByRole('button', { name: 'Enrol' })).toBeVisible();
  await member.goto('/review');
  await expect(member.getByTestId('due-count')).toHaveText('0');
  await member.goto('/plan');
  await expect(member.getByTestId('plan-week')).toHaveCount(0);
  await expect(member.getByRole('button', { name: 'Save plan' })).toBeVisible();

  // A submission is hidden from a member who doesn't know its language.
  const db = await runtime.database();
  const written = await db.prepare("select id from submissions where kind = 'writing'").first();
  const speaking = await db.prepare("select id from exercises where type = 'speaking'").first();
  const upload = await runtime.fetch(`/api/recordings?exerciseId=${speaking.id}`, {
    role: 'owner', method: 'POST', headers: { 'content-type': 'audio/webm' }, body: new Uint8Array([1, 2, 3]),
  });
  expect(upload.status).toBe(201);
  const { id: clipId } = await upload.json();

  await member.goto('/community');
  await expect(member.getByTestId('to-correct-item')).toHaveCount(0);
  await member.goto(`/community/${written.id}`);
  await expect(member.getByTestId('not-found')).toBeVisible();
  await expect(member.getByText('vivo en Sevilla')).toHaveCount(0);
  expect((await runtime.fetch(`/api/recordings/${clipId}`, { role: 'member' })).status).toBe(404);
  expect((await runtime.fetch(`/api/recordings/${clipId}`, { role: 'outsider' })).status).not.toBe(200);
  expect((await runtime.fetch(`/api/recordings/${clipId}`)).status).not.toBe(200);

  // Uploads only to a speaking prompt of a published course.
  const mc = await db.prepare("select id from exercises where type = 'mc'").first();
  expect((await runtime.fetch(`/api/recordings?exerciseId=${mc.id}`, {
    role: 'member', method: 'POST', headers: { 'content-type': 'audio/webm' }, body: new Uint8Array([1]),
  })).status).toBe(400);
  expect((await runtime.fetch('/api/recordings?exerciseId=nope', {
    role: 'member', method: 'POST', headers: { 'content-type': 'audio/webm' }, body: new Uint8Array([1]),
  })).status).toBe(404);

  // Once the member knows Spanish they may correct, but never rate or delete it.
  await member.goto('/profile');
  await choose(member, 'profile-native', 'English');
  await member.getByTestId('known-language').filter({ hasText: 'Spanish' }).click();
  await member.getByRole('button', { name: 'Save' }).click();
  await expect(member.getByText('Saved')).toBeVisible();
  expect((await runtime.fetch(`/api/recordings/${clipId}`, { role: 'member' })).status).toBe(200);
  await member.goto(`/community/${written.id}`);
  await member.getByTestId('correction-text').fill('Me llamo Ana y vivo en Sevilla.');
  await member.getByTestId('correction-comment').fill('Perfect.');
  await member.getByRole('button', { name: 'Send correction' }).click();
  await expect(member.getByTestId('correction')).toHaveCount(1);
  await expect(member.getByRole('button', { name: /^Rate / })).toHaveCount(0);
  await expect(member.getByRole('button', { name: 'Delete submission' })).toHaveCount(0);

  // The author never sees their own work to correct, and can delete it.
  await owner.goto('/community');
  await expect(owner.getByTestId('to-correct-item')).toHaveCount(0);
  await owner.goto(`/community/${written.id}`);
  await expect(owner.getByTestId('correction-text')).toHaveCount(0);
  await owner.getByRole('button', { name: 'Delete submission' }).click();
  await Promise.all([
    owner.waitForURL(/\/community$/),
    owner.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click(),
  ]);
  const left = await db.prepare('select count(*) as n from submissions where id = ?').bind(written.id).first();
  expect(left.n).toBe(0);
  const orphan = await db.prepare('select count(*) as n from corrections where submission_id = ?').bind(written.id).first();
  expect(orphan.n).toBe(0);
} finally {
  await runtime.close();
}
