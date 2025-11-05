import TriviaPopup from '../TriviaPopup';

export default function TriviaPopupExample() {
  const mockQuestion = {
    id: '1',
    question: 'What region of France is Cabernet Sauvignon most famously associated with?',
    answers: [
      'Burgundy',
      'Bordeaux',
      'Champagne',
      'Loire Valley'
    ],
    correctIndex: 1,
    explanation: 'Bordeaux is the most famous region for Cabernet Sauvignon, particularly in the left bank areas like Pauillac and Margaux.',
    image: 'https://images.unsplash.com/photo-1566754892427-0362a3ce2f65?w=800&q=80'
  };

  return (
    <TriviaPopup
      question={mockQuestion}
      currentScore={3}
      totalAnswered={4}
      onAnswer={(correct: boolean) => console.log('Answer correct:', correct)}
      onClose={() => console.log('Closed trivia')}
    />
  );
}
