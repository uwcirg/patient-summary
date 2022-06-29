import React from 'react';
import FHIR from 'fhirclient';
import { FhirClientContext } from './FhirClientContext';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Error from './components/Error';

export default function FhirClientProvider (props) {

    const [client, setClient] = React.useState(null);
    const [error, setError] = React.useState('');

    React.useEffect(() => {
        FHIR.oauth2.ready().then(
            (client) => setClient(client),
            (error) => setError(error)
        );
    }, []);
  
    return (
      <FhirClientContext.Provider value={{client:client, error: error} || {}}>
        <FhirClientContext.Consumer>
          {({ client, error }) => {
            // any auth error that may have been rejected with
            if (error) {
              return <Error message={error.message}></Error>;
            }

            // if client is already available render the subtree
            if (client) {
              return props.children;
            }

            // client is undefined until auth.ready() is fulfilled
            return <Box><CircularProgress></CircularProgress> Authorizing...</Box>
          }}
        </FhirClientContext.Consumer>
      </FhirClientContext.Provider>
    );

}
