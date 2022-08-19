import { Box, Button, Divider, FormControl, FormHelperText, FormLabel, NumberDecrementStepper, NumberIncrementStepper, NumberInput, NumberInputField, NumberInputStepper, Slider, SliderFilledTrack, SliderThumb, SliderTrack, Spacer, Text, Tooltip, useColorModeValue, VStack } from "@chakra-ui/react";
import { useState } from "react";
import { gql, useMutation } from '@apollo/client';
import { useDefaultToast } from "../hooks";

const SAVE_SETTINGS = gql`
  mutation SaveSettings($rows: Int!, $cols: Int!, $maxPlayers: Int!, $connect: Int!) {
    updateLobby(rows: $rows, cols: $cols, maxPlayers: $maxPlayers, connect: $connect) {
      lobbyId
    }
  }
`;

type LobbyParams = { editable: boolean, maxPlayers: number, rows: number, cols: number, connect: number};

export default function LobbySettings({ editable, maxPlayers, rows, cols, connect }: LobbyParams) {
  const containerBg = useColorModeValue('gray.100', 'gray.900');

  const toast = useDefaultToast();

  const [showPlayerTT, setShowPlayerTT] = useState(false);
  const [maxPlayersState, setMaxPlayers] = useState(maxPlayers);

  const [rowsState, setRows] = useState(rows);
  const [colsState, setCols] = useState(cols);

  const [showConnectTT, setShowConnectTT] = useState(false);
  const [connectState, setConnect] = useState(connect);

  const [saveSettings] = useMutation(SAVE_SETTINGS, {
    variables: {
      rows: rowsState,
      cols: colsState,
      maxPlayers: maxPlayersState,
      connect: connectState
    },
    onError: (error) => {
      toast({
        title: 'Error saving settings!',
        description: error.message,
        status: 'error',
      });
    }
  });

  return (
    <Box maxW='md' bg={containerBg} borderWidth='1px' borderRadius='lg'>
      <form style={{ width: '100%' }} onSubmit={(e) => { e.preventDefault(); saveSettings(); }}>
        <VStack p={6} spacing={3}>
          <Text mt={2} fontSize='xl' fontWeight='semibold'>
            Lobby Settings.
          </Text>

          <Divider />

          <Text mt={2}>
            Here you can adjust the settings for your current game lobby.
            <br />
            Only the lobby admin is able to edit these settings.
          </Text>

          <Spacer />

          <FormControl>
            <FormLabel>Maximum player count: {editable ? maxPlayersState : maxPlayers}</FormLabel>
            <Slider min={2} max={10}
              isDisabled={!editable}
              value={editable ? maxPlayersState : maxPlayers}
              onChange={setMaxPlayers}
              onMouseEnter={() => setShowPlayerTT(true)}
              onMouseLeave={() => setShowPlayerTT(false)}>
              <SliderTrack>
                <SliderFilledTrack />
              </SliderTrack>
              <Tooltip hasArrow bg='teal.500' color='white' placement='top' isOpen={showPlayerTT} label={maxPlayersState}>
                <SliderThumb />
              </Tooltip>
            </Slider>
            <FormHelperText>Maximum number of players allowed to join the lobby.</FormHelperText>
          </FormControl>

          <FormControl>
            <FormLabel>Board rows</FormLabel>
            <NumberInput isDisabled={!editable} value={editable ? rowsState : rows} onChange={(_, v) => setRows(v)} min={5} max={30}>
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          </FormControl>

          <FormControl>
            <FormLabel>Board columns</FormLabel>
            <NumberInput isDisabled={!editable} value={editable ? colsState : cols} onChange={(_, v) => setCols(v)} min={5} max={30}>
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          </FormControl>

          <FormControl>
            <FormLabel>Connect amount: {editable ? connectState : connect}</FormLabel>
            <Slider min={2} max={10}
              isDisabled={!editable}
              value={editable ? connectState : connect}
              onChange={setConnect}
              onMouseEnter={() => setShowConnectTT(true)}
              onMouseLeave={() => setShowConnectTT(false)}>
              <SliderTrack>
                <SliderFilledTrack />
              </SliderTrack>
              <Tooltip hasArrow bg='teal.500' color='white' placement='top' isOpen={showConnectTT} label={connectState}>
                <SliderThumb />
              </Tooltip>
            </Slider>
            <FormHelperText>Amount of pieces that have to be connected for a win.</FormHelperText>
          </FormControl>
          
          <Spacer />

          <Button isDisabled={!editable} variant='outline' type='submit'>Save</Button>
        </VStack>
      </form>
    </Box>
  );
}