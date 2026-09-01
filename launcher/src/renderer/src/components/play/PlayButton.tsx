import "./PlayButton.css";

interface PlayButtonProps {
  label?: string;
  disabled?: boolean;
  onClick?: () => void;
}

export function PlayButton({
  label = "Spielen",
  disabled = true,
  onClick
}: PlayButtonProps): React.JSX.Element {
  return (
    <button className="play-button" disabled={disabled} onClick={onClick}>
      {label}
    </button>
  );
}
