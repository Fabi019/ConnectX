import { gql, useMutation, useQuery } from "@apollo/client";
import { Button, Center, Flex, Heading, Text, Tooltip, VStack } from "@chakra-ui/react";
import { useState } from "react";
import ChatPanel from "../components/ChatPanel";
import GameBoard from "../components/GameBoard";
import { useDefaultToast, useSelf } from "../hooks";
import { Lobby } from "../types";

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

const STOP_GAME = gql`
  mutation StopGame {
    stopGame
  }
`;

export default function Game() {
  const toast = useDefaultToast();

  const self = useSelf(toast);
  const [lobbyInfo, setLobbyInfo] = useState<Lobby>();

  const [stopGame] = useMutation(STOP_GAME, {
    onError: (error) => {
      toast({
        status: 'error',
        title: 'Error stoppping game!',
        description: error.message,
      });
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
    onCompleted: (data) => setLobbyInfo(data.lobbyInfo)
  });

  return (
    <Center minH='100vh'>
      <VStack p={6} w='full'>
        <Heading as='h1' size='4xl'>Play</Heading>

        <Text>Connect {lobbyInfo && lobbyInfo.connect}</Text>

        <Flex w='full' flexFlow='wrap' justifyContent='center' gap={8} py={8}>
          {lobbyInfo &&
            <GameBoard rows={lobbyInfo.rows} cols={lobbyInfo.cols} />
          }
          {self &&
            <ChatPanel self={self} />
          }
        </Flex>

        {lobbyInfo && self && lobbyInfo.admin === self.uid &&
          <Tooltip label='Stops the current game and redirect everyone back to the lobby.'>
            <Button colorScheme='red' onClick={_ => stopGame()}>Stop Game</Button>
          </Tooltip>
        }
      </VStack>
    </Center>
  );
}