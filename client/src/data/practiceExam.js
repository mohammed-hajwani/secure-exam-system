// A short practice paper that runs entirely in the browser. Nothing is sent
// to the server and nothing is stored. Answers are checked locally, which is
// exactly what the real exam never does (real answer keys stay on the server).

export const PRACTICE_EXAM = {
  title: 'Practice paper',
  durationSeconds: 180,
  maxViolations: 3,
  questions: [
    {
      id: 'p1',
      text: 'What happens if you switch to another tab during an ExamShield exam?',
      options: [
        { id: 'a', text: 'It is recorded as a violation' },
        { id: 'b', text: 'Nothing happens' },
        { id: 'c', text: 'The timer pauses until you return' },
        { id: 'd', text: 'You are signed out' }
      ],
      correct: 'a',
      explain: 'Leaving the tab, the window or fullscreen is recorded. Reach the violation limit and the exam submits itself.'
    },
    {
      id: 'p2',
      text: 'Which planet is known as the Red Planet?',
      options: [
        { id: 'a', text: 'Venus' },
        { id: 'b', text: 'Mars' },
        { id: 'c', text: 'Jupiter' },
        { id: 'd', text: 'Mercury' }
      ],
      correct: 'b',
      explain: 'Mars. Iron oxide dust gives its surface the red colour.'
    },
    {
      id: 'p3',
      text: 'True or false: refreshing the page gives you extra time.',
      options: [
        { id: 'a', text: 'True' },
        { id: 'b', text: 'False' }
      ],
      correct: 'b',
      fixedOrder: true,
      explain: 'False. The clock is kept by the server, so a refresh picks up exactly where it was.'
    },
    {
      id: 'p4',
      text: 'At sea level, water boils at which temperature?',
      options: [
        { id: 'a', text: '80 °C' },
        { id: 'b', text: '100 °C' },
        { id: 'c', text: '120 °C' },
        { id: 'd', text: '150 °C' }
      ],
      correct: 'b',
      explain: '100 °C at standard atmospheric pressure.'
    },
    {
      id: 'p5',
      text: 'When the timer reaches zero, what happens to the answers you saved?',
      options: [
        { id: 'a', text: 'They are deleted' },
        { id: 'b', text: 'Nothing until you press Submit' },
        { id: 'c', text: 'They are submitted for you' },
        { id: 'd', text: 'You get five extra minutes' }
      ],
      correct: 'c',
      explain: 'Everything you saved is submitted automatically. Answers save as you go, so nothing is lost.'
    }
  ]
};

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Same idea as the real exam: every sitting gets its own option order.
export const preparePracticePaper = () =>
  PRACTICE_EXAM.questions.map((q) => ({ ...q, options: q.fixedOrder ? q.options : shuffle(q.options) }));
