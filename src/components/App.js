import React from 'react';
import FhirClientProvider from "../FhirClientProvider";
import Summary from './Summary';
import '../style/App.scss';

export default function App() {
    return (
        <FhirClientProvider>
            <Summary />
            {/* add other components as needed */}
        </FhirClientProvider>
    );
}
