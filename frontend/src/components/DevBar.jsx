import { Button, ButtonGroup, Spacer, Text, useColorMode } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";

export default function DevBar() {
  const { colorMode, toggleColorMode } = useColorMode();
  const navigate = useNavigate();

  return (
    <ButtonGroup variant='outline' spacing='2'>
      <Text>Debug navigation: </Text>
      <Button size='sm' onClick={_ => navigate('/', { replace: true })}>Home</Button>
      <Button size='sm' onClick={_ => navigate('/lobby', { replace: true })}>Lobby</Button>
      <Button size='sm' onClick={_ => navigate('/play', { replace: true })}>Game</Button>
      <Spacer />
      <Button size='sm' onClick={toggleColorMode}>Toggle {colorMode === 'light' ? 'Dark' : 'Light'}</Button>
    </ButtonGroup>
  );
}