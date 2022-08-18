import { gql, useQuery } from "@apollo/client";
import { useToast } from "@chakra-ui/react";
import { useState } from "react";

const SELF = gql`
  query Self {
    self {
      uid,
      nickname
    }
  }
`;

export function useSelf(toast) {
  const [self, setSelf] = useState();
  useQuery(SELF, {
    fetchPolicy: 'network-only',
    onError: (error) => {
      if (toast) {
        toast({
          title: 'Error loading self!',
          description: error.message,
          status: 'error',
        });
      } else {
        console.error(error);
      }
    },
    onCompleted: (data) => setSelf(data.self)
  });
  return self;
}

export function useDefaultToast(initialProps) {
  const toast = useToast({
    status: 'info',
    isClosable: true,
    position: 'top-right',
    ...initialProps
  });
  return (props) => {
    if (props.status === 'error') {
      if (!toast.isActive(props.description)) {
        toast({
          id: props.description,
          ...props,
        });
      }
    } else {
      toast(props);
    }
  };
}