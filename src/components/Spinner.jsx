
const Spinner = ({ size = 20, color = 'white' }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        style={{ animation: 'spin 1s linear infinite' }}
    >
        <style>
            {`@keyframes spin { 100% { transform: rotate(360deg); } }`}
        </style>
        <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="4" strokeOpacity="0.25" fill="none" />
        <path d="M12 2a10 10 0 0 1 10 10" stroke={color} strokeWidth="4" strokeLinecap="round" fill="none" />
    </svg>
);

export default Spinner;
