import { startRuntime, expect } from '/home/user/oss-new/control/runtime/index.mjs';
import { authorCourse, choose } from './helpers.mjs';

const runtime = await startRuntime();
try {
  let page = await (await runtime.context('owner')).newPage();
  const courseId = await authorCourse(page, {
    title: 'Italian for Food Lovers', description: 'Markets, menus and recipes.', language: 'Italian', level: 'A2', publish: true,
    units: [{ title: 'At the market', lessons: [{ title: 'Fruit and vegetables', exercises: [{ type: 'type', prompt: 'Translate: apple', answer: 'mela' }], vocab: [{ term: 'la mela', translation: 'the apple', example: 'Vorrei due mele.' }] }] }],
  });
  await page.goto(`/courses/${courseId}`);
  await page.getByRole('button', { name: 'Enrol' }).click();
  await page.getByTestId('lesson-row').getByRole('link').click();
  await page.getByTestId('answer-input').fill('mela');
  await page.getByRole('button', { name: 'Check' }).click();
  await page.getByRole('button', { name: 'Finish' }).click();
  await expect(page.getByTestId('lesson-result')).toContainText('Lesson complete');
  await page.goto('/plan');
  await choose(page, 'plan-course', 'Italian for Food Lovers');
  await choose(page, 'plan-level', 'B1');
  await page.getByTestId('plan-days').fill('2');
  await page.getByTestId('plan-minutes').fill('30');
  await page.getByRole('button', { name: 'Save plan' }).click();
  await expect(page.getByTestId('plan-week')).toContainText('of 2');
  await page.goto('/profile');
  await choose(page, 'profile-native', 'Spanish');
  await page.getByTestId('known-language').filter({ hasText: 'Italian' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Saved')).toBeVisible();

  await page.context().close();
  await runtime.restart();

  page = await (await runtime.context('owner')).newPage();
  await page.goto(`/courses/${courseId}`);
  await expect(page.getByRole('heading', { name: 'Italian for Food Lovers' })).toBeVisible();
  await expect(page.getByTestId('lesson-row')).toContainText('Completed');
  await expect(page.getByTestId('course-progress')).toContainText('100%');
  await page.goto('/review');
  await expect(page.getByTestId('group-weak')).toContainText('la mela');
  await page.goto('/plan');
  await expect(page.getByTestId('plan-week')).toContainText('of 2');
  await expect(page.getByTestId('plan-remaining')).toContainText('0');
  await page.goto('/profile');
  await expect(page.getByTestId('profile-native')).toContainText('Spanish');
  const row = await (await runtime.database()).prepare('select known_languages from users').first();
  expect(JSON.parse(row.known_languages)).toContain('Italian');
} finally {
  await runtime.close();
}
