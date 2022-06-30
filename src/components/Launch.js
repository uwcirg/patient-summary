import React from 'react';
import FHIR from 'fhirclient';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Error from './Error';
import {queryPatientIdKey} from '../util/util.js';

export default function Launch() {

    const [error, setError] = React.useState('');

    React.useEffect(() => {

        const urlParams = new URLSearchParams(window.location.search);
         //retrieve patient id from URL querystring if any
        let patientId = urlParams.get('patient');
        console.log("patient id from url query string: ", patientId);
    
        fetch('launch-context.json', {
            // include cookies in request
            credentials: 'include'
        })
        .then(result => {
            if (!result.ok) {
                throw Error(result.status);
            }
            return result.json();
        })
        .catch(e => setError(e))
        .then(json => {
            if (patientId) {
                //only do this IF patient id comes from url queryString
                json.patientId = patientId;
                sessionStorage.setItem(queryPatientIdKey, patientId);
            }
            console.log("launch context json ", json);
            FHIR.oauth2.authorize(json).catch((e) => {
                setError(e);
            });

        })
        .catch(e => {
            setError(e);
            console.log('launch error ', e);
        });
    }, []);

    return (
        <React.Fragment>
            {error && <Error message={error.message}></Error>}
            {!error && <Box style={{ padding: "1rem" }}>
                <CircularProgress></CircularProgress>
                <span>Launching ...</span>
            </Box>}
        </React.Fragment>
    );
}

