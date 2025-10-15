import React, { useEffect } from 'react';

/**
 * AzzurraFrame embeds the remote Azzurra webapp in an iframe and
 * listens for cross-origin messages.  When the iframe sends a
 * message with type `finished`, it invokes the provided onFinish
 * callback with the message payload.  Only messages originating
 * from posti.world are accepted to prevent cross-site injection.
 */
export default function AzzurraFrame({ src, onFinish }) {
  useEffect(() => {
    function handleMessage(event) {
      // Reject messages from unknown origins.  We only expect
      // messages from posti.world.
      if (!event.origin || !event.origin.includes('posti.world')) {
        return;
      }
      const data = event.data;
      if (data && typeof data === 'object' && data.type === 'finished') {
        onFinish(data.output);
      }
    }
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [onFinish]);

  return <iframe src={src} title="Azzurra App" />;
}
