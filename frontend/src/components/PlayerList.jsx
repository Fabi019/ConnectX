import { gql, useMutation } from "@apollo/client";
import { DeleteIcon, StarIcon } from "@chakra-ui/icons";
import { Box, Divider, HStack, IconButton, Text, useColorModeValue, VStack } from "@chakra-ui/react";
import { AnimatePresence, motion } from "framer-motion";
import { useDefaultToast } from "../hooks";

const KICK_PLAYER = gql`
  mutation KickPlayer($uid: String!) {
    kickPlayer(uid: $uid)
  }
`;

export default function PlayerList({ self, admin, players }) {
  const toast = useDefaultToast();
  const containerBg = useColorModeValue('gray.100', 'gray.900');

  const [kickPlayer] = useMutation(KICK_PLAYER, {
    onError: (error) => {
      toast({
        title: 'Error kicking player!',
        description: error.message,
        status: 'error',
      });
    }
  });

  return (
    <Box maxW='md' w='100%' bg={containerBg} borderWidth='1px' borderRadius='lg'>
      <VStack p={6} spacing={3}>
        <Text mt={2} fontSize='xl' fontWeight='semibold'>
          Player List.
        </Text>

        <Divider />

        <VStack
          width='100%'
          spacing={3}
        >
          <AnimatePresence>
            {players.map(player => (
              <HStack
                as={motion.div}
                width='100%'
                initial={{ scale: 0.9, opacity: 0.5 }}
                exit={{ opacity: 0 }}
                animate={{ scale: 1.0, opacity: 1.0 }}
                borderRadius={8}
                bg='primary.700'
                boxShadow='md'
                key={player.uid}
              >
                {player.uid === admin &&
                  <StarIcon ms={3} />
                }
                <Text ms={3} py={2} flex='1' textAlign='start'>
                  {player.nickname}
                </Text>
                <IconButton
                  isDisabled={self !== admin || player.uid === self}
                  onClick={(_) =>
                    kickPlayer({
                      variables: {
                        uid: player.uid
                      }
                    })}
                  aria-label='Kick' size='md' icon={<DeleteIcon />}
                />
              </HStack>
            ))}
          </AnimatePresence>
        </VStack>

      </VStack>
    </Box>
  );
}