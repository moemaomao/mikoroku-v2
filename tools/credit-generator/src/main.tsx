import { createRoot } from "react-dom/client";
import CreditGenerator from "./credit-generator";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Credit Generator root element is missing.");

createRoot(rootElement).render(<CreditGenerator />);
