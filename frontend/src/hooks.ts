import { gql, useQuery } from "@apollo/client";
import { ToastId, useToast, UseToastOptions } from "@chakra-ui/react";
import { useState } from "react";
import { Player } from "./types";

const SELF = gql`
  query Self {
    self {
      uid,
      nickname
    }
  }
`;

export function useSelf(toast: Toast): Player | undefined {
  const [self, setSelf] = useState<Player>();
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

export type Toast = (props: UseToastOptions) => ToastId | undefined;
export function useDefaultToast(initialProps?: UseToastOptions | undefined): Toast {
  const toast = useToast({
    status: 'info',
    isClosable: true,
    position: 'top-right',
    ...initialProps
  });
  return (props: UseToastOptions) => {
    if (props.status === 'error') {
      if (!toast.isActive(props.description as string)) {
        return toast({
          id: props.description as string,
          ...props
        });
      }
    } else {
      return toast(props);
    }
  };
}