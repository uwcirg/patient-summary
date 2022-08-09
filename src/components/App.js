import {useEffect} from 'react';
import FhirClientProvider from "../FhirClientProvider";
import Summary from './Summary';
import '../style/App.scss';
import { fetchEnvData, getEnvs } from "../util/util.js";

export default function App() {
    useEffect(() => {
        fetchEnvData();
        console.log("environment variables ", getEnvs());
    }, []);
    return (
        <FhirClientProvider>
            <Summary />
            {/* add other components as needed */}
        </FhirClientProvider>
    );
}
