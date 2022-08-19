import { extendTheme } from '@chakra-ui/react'

const colors = {
  primary: {
    900: '#1a365d',
    800: '#153e75',
    700: '#2a69ac',
  }
};

const config = {
  initialColorMode: 'dark',
  useSystemColorMode: true,
};

const theme = extendTheme({
  colors,
  config,
});

export default theme;

// adapted from https://stackoverflow.com/a/66494926
export function getPlayerColor(string: string) {
  let stringUniqueHash = [...string].reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  return `hsl(${stringUniqueHash % 360}, 95%, 35%)`;
}