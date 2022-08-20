import { Button, ButtonGroup, Center, Flex, Heading, Link, Spacer, Tag, Text, Tooltip, useClipboard, VStack } from "@chakra-ui/react";

import LobbySettings from "../components/LobbySettings";
import PlayerList from "../components/PlayerList";

import { gql, useQuery, useMutation, useSubscription } from '@apollo/client';
import { useState } from "react";
import { Toast, useDefaultToast, useSelf } from "../hooks";
import { Lobby as LobbyType, LobbyState, LobbyUpdate, Player } from "../types";
import ConfirmDialog from "../components/ConfirmDialog";

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

  const [lobbyState, setLobbyState] = useState<LobbyType>();
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
      window.location.pathname = '/';
    },
    onCompleted: (_) => window.location.pathname = '/'
  })

  useSubscription(LOBBY_STATE, {
    onSubscriptionData: (data) => {
      const lobbyState: LobbyUpdate = data.subscriptionData.data.lobbyState;
      handleLobbyStateData(self!!, lobbyState, toast);
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

        <Spacer />

        <Text>Invite code or link:&nbsp;
          {lobbyState &&
            <LinkTag lobbyId={lobbyState.lobbyId} />
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
          <ConfirmDialog
            buttonText='Leave Lobby'
            description='Are you sure? If you are the current admin, the next longest player in the lobby will be set as admin after you left.'
            onConfirm={leaveLobby}
          />
          {lobbyState && self && self.uid === lobbyState.admin &&
            <Button colorScheme='green' onClick={_ => startGame()}>Start Game</Button>
          }
        </ButtonGroup>
      </VStack>
    </Center>
  );
}

function handleLobbyStateData(self: Player, lobbyState: LobbyUpdate, toast: Toast) {
  if (lobbyState.state === LobbyState.SETTINGS_UPDATE) {
    toast({
      title: 'Lobby settings updated!',
      description: 'The lobby admin has changed the settings.',
      status: 'success',
    });
  } else if (lobbyState.state === LobbyState.PLAYER_JOIN) { // Player join
    toast({
      title: 'Player joined!',
      description: 'A new player has joined the lobby.',
    });
  } else if (lobbyState.state === LobbyState.PLAYER_LEAVE) { // Player leave
    toast({
      title: 'Player left!',
      description: 'A player has left the lobby.',
    });
  } else if (lobbyState.state === LobbyState.PLAYER_KICK) { // Player kick
    // Check if we have been kicked
    if (!lobbyState.lobby.players.some(player => player.uid === self.uid)) {
      window.location.pathname = '/';
    } else {
      toast({
        title: 'Player kicked!',
        status: 'warning',
        description: 'A player has been removed from the lobby.',
      });
    }
  } else if (lobbyState.state === LobbyState.GAME_START) { // Game start
    window.location.pathname = '/play';
  }
}

type LinkTagParams = { lobbyId: string };

function LinkTag({ lobbyId }: LinkTagParams) {
  const url = `${window.location.origin}?lobbyId=${lobbyId}`;
  const { hasCopied, onCopy } = useClipboard(url);

  return (
    <Tooltip hasArrow label={hasCopied ? 'Copied!' : 'Click to copy!'}>
      <Link onClick={(e) => {
        e.preventDefault();
        onCopy();
      }} href={url} isExternal>
        <Tag><Text as='kbd'>{lobbyId}</Text></Tag>
      </Link>
    </Tooltip>
  );
}