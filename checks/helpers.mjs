import { expect } from '/home/user/oss-new/control/runtime/index.mjs';

/** Picks an option in one of the app's Select fields. */
export async function choose(page, testId, optionName) {
  await page.getByTestId(testId).click();
  await page.getByRole('option', { name: optionName, exact: true }).click();
  await expect(page.getByTestId(testId)).toContainText(optionName);
}

const TYPE_LABEL = {
  mc: 'Multiple choice',
  type: 'Type the answer',
  gap: 'Fill the gap',
  writing: 'Writing',
  speaking: 'Speaking',
};

/**
 * Authors a course through the admin pages as an admin and returns its id.
 * units: [{ title, lessons: [{ title, exercises: [{ type, prompt, options?, answer? }], vocab: [{ term, translation, example }] }] }]
 */
export async function authorCourse(page, course) {
  await page.goto('/admin');
  await page.getByTestId('course-title').fill(course.title);
  await page.getByTestId('course-description').fill(course.description ?? '');
  await choose(page, 'course-language', course.language);
  await choose(page, 'course-level', course.level);
  await Promise.all([
    page.waitForURL(/\/admin\/courses\/[^/]+$/),
    page.getByRole('button', { name: 'Create course' }).click(),
  ]);
  const courseUrl = page.url();
  const courseId = courseUrl.split('/').pop();
  await expect(page.getByTestId('course-status')).toHaveText('Draft');

  const lessonUrls = [];
  for (const unit of course.units ?? []) {
    await page.getByTestId('new-unit-title').fill(unit.title);
    await page.getByRole('button', { name: 'Add unit' }).click();
    const card = page.getByTestId('unit').filter({ hasText: unit.title });
    await expect(card).toHaveCount(1);
    for (const lesson of unit.lessons ?? []) {
      await card.getByTestId('new-lesson-title').fill(lesson.title);
      await card.getByRole('button', { name: 'Add lesson' }).click();
      const link = card.getByRole('link', { name: lesson.title, exact: true });
      await expect(link).toBeVisible();
      lessonUrls.push({ lesson, href: await link.getAttribute('href') });
    }
  }

  for (const { lesson, href } of lessonUrls) {
    await page.goto(href);
    await expect(page.getByRole('heading', { name: lesson.title })).toBeVisible();
    let count = 0;
    for (const exercise of lesson.exercises ?? []) {
      await page.getByTestId('exercise-type').filter({ hasText: TYPE_LABEL[exercise.type] }).click();
      await page.getByTestId('exercise-prompt').fill(exercise.prompt);
      if (exercise.type === 'mc') await page.getByTestId('exercise-options').fill(exercise.options.join('\n'));
      if (exercise.answer !== undefined) await page.getByTestId('exercise-answer').fill(exercise.answer);
      await page.getByRole('button', { name: 'Add exercise' }).click();
      count += 1;
      await expect(page.getByTestId('exercise-row')).toHaveCount(count);
    }
    let words = 0;
    for (const item of lesson.vocab ?? []) {
      await page.getByTestId('vocab-term').fill(item.term);
      await page.getByTestId('vocab-translation').fill(item.translation);
      await page.getByTestId('vocab-example').fill(item.example ?? '');
      await page.getByRole('button', { name: 'Add word' }).click();
      words += 1;
      await expect(page.getByTestId('vocab-row')).toHaveCount(words);
    }
  }

  if (course.publish) {
    await page.goto(courseUrl);
    await page.getByRole('button', { name: 'Publish' }).click();
    await expect(page.getByTestId('course-status')).toHaveText('Published');
  }
  return courseId;
}

export const SPANISH = {
  title: 'Everyday Spanish',
  description: 'Greetings, cafés and getting around town.',
  language: 'Spanish',
  level: 'A1',
  publish: true,
  units: [
    {
      title: 'Meeting people',
      lessons: [
        {
          title: 'Greetings',
          exercises: [
            { type: 'mc', prompt: 'How do you say "good morning"?', options: ['Buenos días', 'Buenas noches', 'Hasta luego'], answer: 'Buenos días' },
            { type: 'type', prompt: 'Translate: thank you', answer: 'gracias' },
            { type: 'gap', prompt: 'Me ___ Ana. (My name is Ana.)', answer: 'llamo' },
            { type: 'writing', prompt: 'Write two sentences introducing yourself.' },
            { type: 'speaking', prompt: 'Say where you live and what you do.' },
          ],
          vocab: [
            { term: 'hola', translation: 'hello', example: '¡Hola! ¿Qué tal?' },
            { term: 'gracias', translation: 'thank you', example: 'Muchas gracias por todo.' },
            { term: 'adiós', translation: 'goodbye', example: 'Adiós, hasta mañana.' },
          ],
        },
        {
          title: 'At the café',
          exercises: [{ type: 'type', prompt: 'Translate: coffee with milk', answer: 'café con leche' }],
          vocab: [{ term: 'la cuenta', translation: 'the bill', example: 'La cuenta, por favor.' }],
        },
      ],
    },
  ],
};

export const VOCAB = { hola: 'hello', gracias: 'thank you', 'adiós': 'goodbye', 'la cuenta': 'the bill' };
