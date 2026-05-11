import Error from "../assets/pageError.jpg";
import { useEffect } from "react";

const PageNotFound = () => {

  const text = "Page Not Found";

  useEffect(()=>{
        document.title=text;
      },[text])

  return (
    <main>
      <img className="mb-5" src={Error} alt="" />
      <a href='/' className="flex justify-center text-center text-white bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-700 dark:border-gray-700">Go Back to Home Page</a>
    </main>
  )
}

export default PageNotFound