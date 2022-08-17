import { gql, useMutation, useQuery, useSubscription } from "@apollo/client";
import { Grid, GridItem, Icon, Tooltip } from "@chakra-ui/react";
import { motion, useAnimation } from "framer-motion";
import { useEffect } from "react";
import { useState } from "react";
import { useDefaultToast } from "../hooks";
import { getPlayerColor } from "../theme";

const MAKE_TURN = gql`
  mutation MakeTurn($col: Int!) {
    makeTurn(col: $col)
  }
`;

const GAME_STATE = gql`
  subscription GameState {
      gameState {
      lobbyId,
      state,
      player {
        uid,
        nickname,
      },
      board {
        uid,
        nickname,
      }
    }
  }
`;

const GAME_INFO = gql`
  query GameInfo {
    gameInfo {
      uid,
      nickname,
    }
  }
`;

export default function GameBoard({ rows, cols }) {
  const toast = useDefaultToast();

  const [selectedCol, setSelectedCol] = useState();

  const [board, setBoard] = useState([]);

  useSubscription(GAME_STATE, {
    onError: (error) => {
      toast({
        title: 'Error updating game!',
        description: error.message,
        status: 'error',
      });
    },
    onSubscriptionData: (data) => {
      const gameState = data.subscriptionData.data.gameState;
      handleGameStateData(gameState, toast);
      if (gameState.board) {
        setBoard(gameState.board);
      }
    }
  });

  const [makeTurn] = useMutation(MAKE_TURN, {
    onError: (error) => {
      toast({
        title: 'Error executing turn!',
        description: error.message,
        status: 'error',
      });
    },
  });

  useQuery(GAME_INFO, {
    fetchPolicy: 'network-only',
    onError: (error) => {
      toast({
        title: 'Error loading game board!',
        description: error.message,
        status: 'error',
      });
    },
    onCompleted: (data) => setBoard(data.gameInfo)
  })

  return (
    <Grid
      cursor='pointer'
      onMouseLeave={_ => setSelectedCol(-1)}
      alignSelf='center'
      border='1px solid'
      borderRadius={5}
      autoColumns={40}
      autoRows={40}
      bg='rgba(200, 200, 200, 0.3)'
    >
      {[...Array(cols)].map((_, col) =>
        [...Array(rows)].map((_, row) =>
          <BoardElement
            key={col * row + row}
            col={col}
            row={rows - row}
            player={board[col] && board[col][row]}
            bg={selectedCol === col ? 'rgba(200, 200, 200, 0.3)' : 'transparent'}
            onClick={() => makeTurn({ variables: { col } })}
            onEnter={() => setSelectedCol(col)}
          />
        ))
      }
    </Grid>
  );
}

function BoardElement({ col, row, player, onClick, onEnter, bg }) {
  const controls = useAnimation();

  useEffect(() => {
    if (player) {
      controls.start({
        opacity: 1,
        y: 0,
        display: 'block',
        transition: {
          type: 'spring',
          bounce: 0.25,
        },
      });
    }
  }, [controls, player]);

  return (
    <GridItem
      onMouseEnter={_ => onEnter()}
      onClick={_ => onClick()}
      gridColumn={col + 1}
      gridRow={row}
      bg={bg}
    >
      <Tooltip
        hasArrow
        label={player && player.nickname}
      >
        <Icon
          overflow='visible'
          viewBox='0 0 200 200'
          boxSize={10}
          color={
            player ?
              getPlayerColor(player.uid)
              : 'transparent'
          }
        >
          <motion.path
            initial={{ opacity: 0, y: -500 }}
            animate={controls}
            display='none'
            fill='currentColor'
            d='M 100, 100 m -75, 0 a 75,75 0 1,0 150,0 a 75,75 0 1,0 -150,0'
          />
          <path
            stroke='black' strokeWidth='4' fill='none'
            d='M 100, 100 m -75, 0 a 75,75 0 1,0 150,0 a 75,75 0 1,0 -150,0'
          />
        </Icon>
      </Tooltip>
    </GridItem>
  )
}

function handleGameStateData(gameState, toast) {
  if (gameState.state === 'LOBBY') { // Lobby
    window.location = '/lobby';
  } else if (gameState.state === 'TURN') { // Turn update
    toast({
      title: 'Turn has changed!',
      description: `Next player is: ${gameState.player.nickname}.`,
    });
  } else if (gameState.state === 'PLACE') { // Place update
    /*toast({
      status: 'success',
      title: 'Turn finished!',
      description: `${gameState.player.nickname} finished their turn.`,
    });*/
  } else if (gameState.state === 'GAME_END') { // Game end
    toast({
      status: 'success',
      title: 'Game finished!',
      duration: 10000,
      isClosable: false,
      description: `${gameState.player.nickname} has won!`,
    });
  }
}