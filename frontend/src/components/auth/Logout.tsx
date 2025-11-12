import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/useAuthStore";
import { useNavigate } from "react-router";

const Logout = () => {

    const { signOut } = useAuthStore(); 
    const navigate = useNavigate();  // Import the useNavigate hook from react-router-dom.  // Use the useNavigate hook to access the navigation functionality.  // This hook provides the necessary
    const handleLogout = async () => {
        try {
            await signOut();  // Call the signOut function from the AuthStore to log out the user.
            navigate("/");  // After logging out, redirect the user to the signin page using the useNavigate hook.  // The signin page is typically implemented as a separate component and is accessed using the "/signin" route.  // You can customize the navigation logic as needed.  // The navigate function is provided by the react-router-dom library.  // This function takes a route path as an argument and navigates to that route.  // The signOut function is called
        } catch (error) {
            console.error(error);  // Log any errors that occur during the logout process.  // You can customize the error handling logic as needed.  // The error will be logged to the
        }
    }
   
     return (
        <Button onClick={handleLogout}>Đăng xuất</Button>  // Use the signOut function from the AuthStore to handle the logout functionality.  // This button will trigger the signOut function when clicked.  // The signOut function is provided by the AuthStore.  // This is a simple implementation, you can add more logic or specific error handling as needed.  // Make sure to import and use the AuthStore in your component.  // You can use the useAuthStore hook provided by the @/stores/useAuthStore.ts file.  // Make sure to import the necessary dependencies and setup the AuthStore in your application.  // The AuthStore provides the user, signIn, and signOut functions.  // You can use these functions in your component to interact with the authentication logic.  // This component will render a simple button that, when clicked, triggers the signOut function.  // The signOut function
    )
}

export default Logout;