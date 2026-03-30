interface NetlifyUser {
  jwt: () => Promise<string>;
  app_metadata?: {
    roles?: string[];
  };
}

interface NetlifyIdentity {
  on: (event: string, callback: (user?: NetlifyUser) => void) => void;
  currentUser: () => NetlifyUser | null;
  open: () => void;
  close: () => void;
  logout: () => void;
}

interface Window {
  netlifyIdentity?: NetlifyIdentity;
}
