
import { InferenceClient } from "https://cdn.jsdelivr.net/npm/@huggingface/inference/+esm";

const themeToggle = document.querySelector(".theme-toggle");
const promptForm = document.querySelector(".prompt-form");
const promptInput = document.querySelector(".prompt-input");
const promptBtn = document.querySelector(".prompt-btn");
const modelSelect = document.getElementById("model-select");
const countSelect = document.getElementById("count-select");
const ratioSelect = document.getElementById("ratio-select");
const gridGallery = document.querySelector(".gallery-grid");
const generateBtn = document.querySelector(".generate-btn");

// Hugging Face API Token
const API_KEY = "Your API Key";

// Hugging Face Client
const hf = new InferenceClient(API_KEY);

// Example Prompts
const examplePrompts = [
    "A magic forest with glowing plants and fairy homes among giant mushrooms",
    "An old steampunk airship floating through golden clouds at sunset",
    "A future Mars colony with glass domes and gardens against red mountains",
    "A dragon sleeping on gold coins in a crystal cave",
    "An underwater kingdom with merpeople and glowing coral buildings",
    "A floating island with waterfalls pouring into clouds below",
    "A witch's cottage in fall with magic herbs in the garden",
    "A robot painting in a sunny studio with art supplies around it",
    "A magical library with floating glowing books and spiral staircases",
    "A Japanese shrine during cherry blossom season with lanterns and misty mountains",
    "A cosmic beach with glowing sand and an aurora in the night sky",
    "A medieval marketplace with colorful tents and street performers",
    "A cyberpunk city with neon signs and flying cars at night",
    "A peaceful bamboo forest with a hidden ancient temple",
    "A giant turtle carrying a village on its back in the ocean"
];

// Theme Initialization
(() => {
 const savedTheme = localStorage.getItem("theme");
 const systemPrefersDark =window.matchMedia("(prefers-color-scheme: dark)").matches;
 const isDarkTheme = savedTheme === "dark" ||(!savedTheme && systemPrefersDark);
 document.body.classList.toggle("dark-theme", isDarkTheme);
    if (themeToggle) {
        const icon = themeToggle.querySelector("i");
        
        if (icon) {
            icon.className =isDarkTheme ? "fa-solid fa-sun" : "fa-solid fa-moon";
        }
    }

})();

// Toggle Theme

const toggleTheme = () => {
    const isDarkTheme = document.body.classList.toggle( "dark-theme");
    localStorage.setItem("theme", isDarkTheme ? "dark" : "light");
    const icon =themeToggle.querySelector("i");
    
    if (icon) {
        icon.className =isDarkTheme ? "fa-solid fa-sun" : "fa-solid fa-moon";
    }
};


if (themeToggle) {
    themeToggle.addEventListener("click",toggleTheme);
}

// Calculate Image Dimensions

const getImageDimensions = ( aspectRatio, baseSize = 512 ) => {
    const [width, height] =aspectRatio.split("/").map(Number);
    const scaleFactor =baseSize / Math.sqrt(width * height);
    let calculatedWidth = Math.round(width * scaleFactor);
    let calculatedHeight =Math.round(height * scaleFactor);

    // Keep dimensions divisible by 16
    calculatedWidth =Math.floor(calculatedWidth / 16) * 16;
    calculatedHeight =Math.floor(calculatedHeight / 16) * 16;
    return {width: calculatedWidth, height: calculatedHeight};
};

// Update Image Card

const updateImageCard = ( imageIndex, imageBlob) => {
    const imgCard =document.getElementById(`img-card-${imageIndex}`);
    
    if (!imgCard) {
        return;
    }
    const imageURL = URL.createObjectURL(imageBlob);
    imgCard.classList.remove("loading");
    imgCard.classList.remove("error");
    imgCard.innerHTML = `<img src="${imageURL}" class="result-img" alt="AI Generated Image"/>
            <div class="img-overlay">
            <a
                href="${imageURL}"
                class="img-download-btn"
                download="ai-generated-${Date.now()}.png"
                title="Download image"
            >
                <i class="fa-solid fa-download"></i>

            </a>
        </div>
    `;
};

// Show Image Error

const showImageError = ( imageIndex, errorMessage) => {
const imgCard =document.getElementById(`img-card-${imageIndex}`);
    if (!imgCard) {
        return;
    }

    imgCard.classList.remove("loading");
    imgCard.classList.add("error");
    imgCard.innerHTML = `<div class="status-container">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <p class="status-text">
                ${errorMessage}
            </p>
        </div>
    `;

        
};

// Generate Single Image
const generateSingleImage = async ( selectedModel, aspectRatio, promptText, imageIndex) => {
    const {width,height} = getImageDimensions(aspectRatio);
        try {
            console.log("Generating image...");
            console.log("Model:",selectedModel);
            console.log("Size:",`${width} x ${height}`);

       
        // Hugging Face Inference Providers

const imageBlob =await hf.textToImage({
    model:selectedModel,
    inputs:promptText,
    provider:"auto",
    parameters: { width:width, height:height}
});
    if (!imageBlob) {
        throw new Error(
            "No image was returned by Hugging Face."
            );
        }
    updateImageCard(imageIndex,imageBlob);
    } catch (error) {
        console.error("Image generation error:",error);
        let errorMessage = error?.message || "Failed to generate image.";

// Friendly Error Messages
        if (errorMessage.includes("401") ||errorMessage.toLowerCase().includes("unauthorized")) {
            errorMessage ="Invalid Hugging Face token. Please create a new token with Inference Providers permission.";

        }else if (errorMessage.includes("403") || errorMessage.toLowerCase().includes("forbidden")) {
            errorMessage ="Your Hugging Face token does not have Inference Providers permission.";

        }else if (errorMessage.toLowerCase().includes("not supported")) {
            errorMessage ="This model is not available through the selected provider.";

        }else if (errorMessage.toLowerCase().includes("credit")) {
            errorMessage ="Your Hugging Face account does not have enough inference credits.";

        }
showImageError(imageIndex,errorMessage);
    }
};

// Generate Images

const generateImages = async (selectedModel, imageCount, aspectRatio, promptText) => {
    // Disable Generate button
    if (generateBtn) {
        generateBtn.disabled = true;
    }

    try {
        const imagePromises = Array.from({ length: imageCount },(_, index) => {
                return generateSingleImage(selectedModel, aspectRatio, promptText, index);
            }
        );

        await Promise.allSettled(imagePromises);

    } finally {
        if (generateBtn) {
            generateBtn.disabled = false;
        }
    }
};

// Create Loading Image Cards

const createImageCards = (selectedModel, imageCount, aspectRatio, promptText) => {
    gridGallery.innerHTML = "";

    // Create loading cards
    for (let i = 0; i < imageCount;i++) {
        const imageCard =document.createElement("div");
        imageCard.className ="img-card loading";
        imageCard.id =`img-card-${i}`;
        imageCard.style.aspectRatio =aspectRatio;
        imageCard.innerHTML = `<div class="status-container">
                <div class="spinner"></div>
                <p class="status-text">
                    Generating...
                </p>
            </div>
        `;

        gridGallery.appendChild(imageCard);
    }


    // Start generation

    generateImages(selectedModel, imageCount, aspectRatio, promptText);
};

// Handle Form Submit

const handleFormSubmit = (e) => {
    e.preventDefault();
    
    const selectedModel =modelSelect.value;
    const imageCount =parseInt(countSelect.value, 10) || 1;
    const aspectRatio =ratioSelect.value || "1/1";
    const promptText = promptInput.value.trim();

    if (!promptText) {
        promptInput.focus();
        return;
    }

    // Create loading cards
    createImageCards(selectedModel, imageCount, aspectRatio, promptText );
};

// Random Prompt

if (promptBtn) {
    promptBtn.addEventListener("click",() => {
        const randomIndex = Math.floor(Math.random() *examplePrompts.length);
        promptInput.value = examplePrompts[randomIndex];
        promptInput.focus();

        }
    );
}

// Form Submit
if (promptForm) {
    promptForm.addEventListener("submit", handleFormSubmit);
};

