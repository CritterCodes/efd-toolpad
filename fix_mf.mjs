import fs from 'fs';

const p = 'src/app/components/materials/MaterialForm.js';
let txt = fs.readFileSync(p, 'utf8');

txt = txt.replace(
`export default function MaterialForm(props) {
  const {
  formData,
  setFormData,
  onFetchStullerData,
  loadingStuller = false,
  isEditing = false,
  isVariantMode = false
}) {`,
`export default function MaterialForm(props) {
  const {
    formData,
    setFormData,
    onFetchStullerData,
    loadingStuller = false,
    isEditing = false,
    isVariantMode = false
  } = props;`
);

fs.writeFileSync(p, txt);
console.log("Props patched.");
