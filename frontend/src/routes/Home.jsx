import { gql, useMutation } from '@apollo/client';
import { Box, Button, Center, Divider, FormControl, FormHelperText, FormLabel, Heading, Input, Spacer, Text, useColorModeValue, VStack } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDefaultToast } from '../hooks';

const CREATE_LOBBY = gql`
  mutation CreateLobby {
    createLobby {
      lobbyId
    }
  }
`;

const JOIN_LOBBY = gql`
  mutation JoinLobby($lobbyId: String!, $nickname: String!) {
    joinLobby(lobbyId: $lobbyId, nickname: $nickname) {
      lobbyId,
      rows,
      cols,
      admin,
      connect,
      maxPlayers,
      players {
        uid,
        nickname
      }
    }
  }
`;

export default function CreateLobby() {
  const toast = useDefaultToast();
  const containerBg = useColorModeValue('gray.100', 'gray.900');

  const [nickname, setNickname] = useState('');
  const [lobbyId, setLobbyId] = useState('');

  const location = useLocation();
  const navigate = useNavigate();
  
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const id = queryParams.get('lobbyId');
    if (id) {
      setLobbyId(id);
    }
  }, [location.search]);

  const [createLobby] = useMutation(CREATE_LOBBY, {
    onError: (error) => {
      toast({
        title: 'Error creating lobby!',
        description: error.message,
        status: 'error',
      });
    },
    onCompleted: (data) => onJoin(data.createLobby.lobbyId, nickname)
  });

  const [joinLobby] = useMutation(JOIN_LOBBY, {
    onError: (error) => {
      toast({
        title: 'Error joining lobby!',
        description: error.message,
        status: 'error',
      });
    },
    onCompleted: (data) => {
      setLobbyId(data.joinLobby);
      navigate('/lobby');
    }
  });

  const onJoin = (lobbyId, nickname) => {
    joinLobby({
      variables: {
        lobbyId,
        nickname
      }
    });
  }

  const onCreate = (nickname) => {
    setNickname(nickname);
    createLobby();
  };

  return (
    <Center minH='100vh'>
      <VStack spacing={12} p={6}>
        <Heading as='h1' size='4xl'>ConnectX</Heading>

        <Box maxW='md' bg={containerBg} borderWidth='1px' borderRadius='lg'>
          <form style={{ width: '100%' }} onSubmit={(e) => {
            e.preventDefault();
            if (lobbyId) {
              onJoin(lobbyId, nickname);
            } else {
              onCreate(nickname);
            }
          }}>
            <VStack p='6' spacing={3}>
              <Text mt={2} fontSize='xl' fontWeight='semibold'>
                Create or join Lobby.
              </Text>

              <Divider />

              <Text mt={2}>
                Input your nickname in the text-field below and create a new lobby or provide a lobby id to join an existing one.
              </Text>

              <Spacer />

              <FormControl isRequired>
                <FormLabel>Nickname</FormLabel>
                <Input placeholder='Nickname' value={nickname} onChange={(e) => setNickname(e.target.value)} />
              </FormControl>

              <FormControl>
                <FormLabel>Lobby ID</FormLabel>
                <Input placeholder='Lobby ID' value={lobbyId} onChange={(e) => setLobbyId(e.target.value)} />
                <FormHelperText>Only required if you want to join a game.</FormHelperText>
              </FormControl>

              <Spacer />

              <Button type='submit' colorScheme='green'>
                {lobbyId ? 'Join Lobby' : 'Create Lobby'}
              </Button>
            </VStack>
          </form>
        </Box>

        <Text as='kbd'>version 1.0.1 ({process.env.NODE_ENV})</Text>
      </VStack>
    </Center>
  );
}