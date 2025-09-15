import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";  // Should match the default export

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />  {/* Using default export */}
        {/* other routes */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;