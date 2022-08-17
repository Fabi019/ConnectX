import { gql, useMutation, useSubscription } from "@apollo/client";
import { Box, Button, Divider, Flex, HStack, Input, Text, useColorModeValue, VStack } from "@chakra-ui/react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { useRef } from "react";
import { useState } from "react";
import { useDefaultToast } from "../hooks";
import { getPlayerColor } from "../theme";

const WRITE_CHAT = gql`
  mutation WriteChat($message: String!) {
    writeChat(message: $message)
  }
`;

const CHAT_UPDATE = gql`
  subscription ChatUpdate {
    chatMessage {
      message,
      player {
        uid,
        nickname,
      }
    }
  }
`;

export default function ChatPanel({ self }) {
  const containerBg = useColorModeValue('gray.100', 'gray.900');

  const toast = useDefaultToast();

  const [chatMessages, setChatMessages] = useState([]);
  const [message, setMessage] = useState('');

  const addMessage = (message) => {
    setChatMessages([...chatMessages, message]);
  };

  const scrollRef = useRef();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const [writeChat] = useMutation(WRITE_CHAT, {
    onError: (error) => {
      toast({
        title: 'Error writing chat message!',
        description: error.message,
        status: 'error',
      });
    }
  });

  useSubscription(CHAT_UPDATE, {
    onError: (error) => {
      toast({
        title: 'Error loading chat!',
        description: error.message,
        status: 'error',
      });
    },
    onSubscriptionData: (data) => {
      const chatMessage = data.subscriptionData.data.chatMessage;
      addMessage(chatMessage);
    }
  });

  return (
    <Box maxW='md' bg={containerBg} borderWidth='1px' height='xl' borderRadius='lg' alignSelf='center'>
      <Flex flexDirection='column' height='100%' p='6' gap={3}>
        <Text mt={2} fontSize='xl' fontWeight='semibold' textAlign='center'>
          Chatbox.
        </Text>

        <Divider />

        <AnimatePresence>
          <VStack flex={1} overflow='scroll' ref={scrollRef}>
            {self && chatMessages.map((message, idx) => (
              <ChatItem self={self} message={message} key={idx} />
            ))}
          </VStack>
        </AnimatePresence>

        <form
          style={{ width: '100%' }}
          onSubmit={(e) => {
            e.preventDefault();
            //alert('submit chat: ' + message);
            /*addMessage({
              message,
              player: {
                uid: '48f3a8aa-bcc7-45f3-a50c-cf391101b511',
                nickname: 'Fabian',
              }
            });*/
            writeChat({
              variables: {
                message: message
              }
            });
            setMessage('');
          }}
        >
          <HStack>
            <Input required maxLength={30} placeholder='Message' value={message} onChange={(e) => setMessage(e.target.value)}></Input>
            <Button type='submit'>Send</Button>
          </HStack>
        </form>
      </Flex>
    </Box>
  )
}

function ChatItem({ message, self }) {
  const isOwnMessage = (self.uid === message.player.uid);
  return (
    <Flex
      as={motion.div}
      initial={{ scale: 0.9, opacity: 0.5 }}
      exit={{ opacity: 0 }}
      animate={{ scale: 1.0, opacity: 1.0 }}
      flexDirection='column'
      borderRadius={8}
      bg={isOwnMessage ? 'primary.700' : 'transparent'}
      borderWidth='1px'
      borderColor='primary.700'
      p={2}
      alignSelf={isOwnMessage ? 'end' : 'start'}
      alignItems='start'
    >
      {!isOwnMessage &&
        <Text color={getPlayerColor(message.player.uid)} fontSize='sm'>{message.player.nickname}</Text>
      }
      <Text maxWidth='250px'>{message.message}</Text>
    </Flex>
  );
}