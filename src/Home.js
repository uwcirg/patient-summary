import React from 'react';
import FhirClientProvider from "./FhirClientProvider";
import Summary from './components/Summary';

export default function Home() {
    return (
        <FhirClientProvider>
            <Summary />
        </FhirClientProvider>
    );
}
