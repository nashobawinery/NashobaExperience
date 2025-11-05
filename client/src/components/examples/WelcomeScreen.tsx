import WelcomeScreen from '../WelcomeScreen';

export default function WelcomeScreenExample() {
  return (
    <WelcomeScreen 
      onStart={(name) => console.log('Starting tasting for:', name)} 
    />
  );
}
