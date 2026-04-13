let cart = [];

// Function to add an item to the cart
const addToCart = (item) => {
    cart.push(item);
    console.log(`${item.name} has been added to the cart.`);
};

// Function to render the contents of the cart
const render = () => {
    console.log("Cart Contents:");
    cart.forEach(item => {
        console.log(`- ${item.name}: $${item.price}`);
    });
};

// Function to get the current state of the cart
const getCartState = () => {
    return cart;
};

// Exporting the cart management functions
export { addToCart, render, getCartState };