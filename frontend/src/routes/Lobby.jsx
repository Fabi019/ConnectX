import { Button, ButtonGroup, Center, Flex, Heading, Link, Text, VStack } from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";

import LobbySettings from "../components/LobbySettings";
import PlayerList from "../components/PlayerList";

import { gql, useQuery, useMutation, useSubscription } from '@apollo/client';
import { useState } from "react";
import { useDefaultToast, useSelf } from "../hooks";

const LOBBY_INFO = gql`
  query LobbyInfo {
    lobbyInfo {
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

const LEAVE_LOBBY = gql`
  mutation LeaveLobby {
    leaveLobby
  }
`;

const LOBBY_STATE = gql`
  subscription LobbyState {
    lobbyState {
      state,
      lobby {
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
  }
`;

const START_GAME = gql`
  mutation StartGame {
    startGame
  }
`;

export default function Lobby() {
  const toast = useDefaultToast();

  const [lobbyState, setLobbyState] = useState();
  const self = useSelf(toast);

  const [startGame] = useMutation(START_GAME, {
    onError: (error) => {
      toast({
        title: 'Error starting game!',
        description: error.message,
        status: 'error',
      });
    },
  })

  const [leaveLobby] = useMutation(LEAVE_LOBBY, {
    onError: (error) => {
      toast({
        title: 'Error leaving lobby!',
        description: error.message,
        status: 'error',
      });
      window.location = '/';
    },
    onCompleted: (_) => window.location = '/'
  })

  useSubscription(LOBBY_STATE, {
    onError: (error) => {
      toast({
        title: 'Error updating lobby!',
        description: error.message,
        status: 'error',
      });
    },
    onSubscriptionData: (data) => {
      const lobbyState = data.subscriptionData.data.lobbyState;
      handleLobbyStateData(self, lobbyState, toast);
      setLobbyState(lobbyState.lobby);
    }
  });

  useQuery(LOBBY_INFO, {
    fetchPolicy: 'network-only',
    onError: (error) => {
      toast({
        title: 'Error loading lobby info!',
        description: error.message,
        status: 'error',
      });
    },
    onCompleted: (data) => setLobbyState(data.lobbyInfo)
  });

  return (
    <Center minH='100vh'>
      <VStack p={6} w='full'>
        <Heading as='h1' size='4xl'>Lobby</Heading>

        <Text>Invite code or link:&nbsp;
          {lobbyState &&
            <Link href={`${window.location.origin}?lobbyId=${lobbyState.lobbyId}`} isExternal>
              <Text as='kbd'>{lobbyState.lobbyId}</Text><ExternalLinkIcon mx='2px' />
            </Link>
          }
        </Text>

        <Flex w='full' flexFlow='wrap' justifyContent='center' gap={8} py={8}>
          {lobbyState && self &&
            <LobbySettings
              editable={self.uid === lobbyState.admin}
              maxPlayers={lobbyState.maxPlayers}
              rows={lobbyState.rows}
              cols={lobbyState.cols}
              connect={lobbyState.connect}
            />
          }
          {lobbyState && self &&
            <PlayerList self={self.uid} admin={lobbyState.admin} players={lobbyState.players} />
          }
        </Flex>

        <ButtonGroup>
          <Button colorScheme='red' onClick={leaveLobby}>Leave Lobby</Button>
          {lobbyState && self && self.uid === lobbyState.admin &&
            <Button colorScheme='green' onClick={startGame}>Start Game</Button>
          }
        </ButtonGroup>
      </VStack>
    </Center>
  );
}

function handleLobbyStateData(self, lobbyState, toast) {
  if (lobbyState.state === 'SETTINGS_UPDATE') {
    toast({
      title: 'Lobby settings updated!',
      description: 'The lobby admin has changed the settings.',
      status: 'success',
    });
  } else if (lobbyState.state === 'PLAYER_JOIN') { // Player join
    toast({
      title: 'Player joined!',
      description: 'A new player has joined the lobby.',
    });
  } else if (lobbyState.state === 'PLAYER_LEAVE') { // Player leave
    toast({
      title: 'Player left!',
      description: 'A player has left the lobby.',
    });
  } else if (lobbyState.state === 'PLAYER_KICK') { // Player kick
    // Check if we have been kicked
    if (!lobbyState.lobby.players.some(player => player.uid === self.uid)) {
      window.location = '/';
    } else {
      toast({
        title: 'Player kicked!',
        description: 'A player has been removed from the lobby.',
      });
    }
  } else if (lobbyState.state === 'GAME_START') { // Game start
    window.location = '/play';
  }
}