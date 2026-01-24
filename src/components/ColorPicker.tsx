type ColorPickerProps ={
  color?: string;
  onColorChange: (color: string) => void;
}

const PRESET_COLORS = [
  '#FFFFFF', // White
  '#FEF3C7', // Yellow
  '#E0E7FF', // Purple/Indigo
  '#D1FAE5', // Green
  '#FCE7F3', // Pink
  '#FEE2E2', // Red
  '#DBEAFE', // Blue
  '#E5E7EB', // Gray
]

const datalist = document.createElement('datalist')
datalist.id = 'colors'
PRESET_COLORS.forEach((color) => {
  const option = document.createElement('option')
  option.value = color
  datalist.appendChild(option)
})
document.body.appendChild(datalist)

export const ColorPicker = ({ color, onColorChange }: ColorPickerProps) => {
  return (
    <input
      className="ColorPicker"
      type="color"
      value={color || PRESET_COLORS[0]}
      onInput={(e) => onColorChange((e.target as HTMLInputElement).value)}
      list="colors"
    />
  )
}
