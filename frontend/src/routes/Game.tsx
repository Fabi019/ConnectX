import { gql, useMutation, useQuery } from "@apollo/client";
import { Center, Flex, Heading, Spacer, Text, Tooltip, VStack } from "@chakra-ui/react";
import { useState } from "react";
import ChatPanel from "../components/ChatPanel";
import ConfirmDialog from "../components/ConfirmDialog";
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

        <Spacer />

        <Text>Connect {lobbyInfo && lobbyInfo.connect}</Text>

        <Flex w='full' flexFlow='wrap' justifyContent='center' gap={8} py={8}>
          {lobbyInfo && self &&
            <GameBoard rows={lobbyInfo.rows} cols={lobbyInfo.cols} self={self} />
          }
          {self &&
            <ChatPanel self={self} />
          }
        </Flex>

        {lobbyInfo && self && lobbyInfo.admin === self.uid &&
          <Tooltip label='Stops the current game and redirect everyone back to the lobby.'>
            <ConfirmDialog 
              buttonText='Stop Game'
              description='Are you sure? Everyone will get sent back to the lobby and the current game can not be recovered after that.'
              onConfirm={stopGame}
            />
          </Tooltip>
        }
      </VStack>
    </Center>
  );
}