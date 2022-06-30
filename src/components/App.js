// import { 
//   BrowserRouter,
//   Link,
//   Routes,
//   Route,
// } from "react-router-dom";
// import Home from "./Home";
// import Launch from "./Launch";
// import './style/App.scss';

// function App() {
//   return (
//     <BrowserRouter basename={process.env.PUBLIC_URL}>
//       <Routes>
//         <Route path="/" element={<Home />} />
//         <Route path="launch" element={<Launch />} />
//         <Route
//           path="*"
//           element={
//             <main style={{ padding: "1rem" }}>
//               <Link to="/">Back to Home</Link>
//             </main>
//           }
//         />
//       </Routes>
//     </BrowserRouter>
//   );
// }

// export default App;

import React from 'react';
import FhirClientProvider from "../FhirClientProvider";
import Summary from './Summary';

export default function App() {
    return (
        <FhirClientProvider>
            <Summary />
        </FhirClientProvider>
    );
}

