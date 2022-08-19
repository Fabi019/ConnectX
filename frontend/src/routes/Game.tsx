import { gql, useMutation, useQuery } from "@apollo/client";
import { AlertDialog, AlertDialogBody, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogOverlay, Button, Center, Flex, Heading, Spacer, Text, Tooltip, useDisclosure, VStack } from "@chakra-ui/react";
import { useRef, useState } from "react";
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
            <ConfirmStopGameButton onConfirm={stopGame} />
          </Tooltip>
        }
      </VStack>
    </Center>
  );
}

type ConfirmStopGameButtonParams = { onConfirm: () => void };

function ConfirmStopGameButton({ onConfirm }: ConfirmStopGameButtonParams) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <Button colorScheme='red' onClick={onOpen}>
        Stop Game
      </Button>

      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize='lg' fontWeight='bold'>
              Stop Game
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure? Everyone will get sent back to the lobby and the current game can not be recovered after that.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose}>
                Cancel
              </Button>
              <Button colorScheme='red' onClick={onConfirm} ml={3}>
                Confirm
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  )
}