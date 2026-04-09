import fs from 'fs';

const txt = fs.readFileSync('dump_artisan.txt', 'utf8');

const listStart = txt.indexOf('{/* Assigned Artisans List */}');
const listEnd = txt.indexOf('        {/* Assign Artisan Dialog */}');

const dialogStart = txt.indexOf('{/* Assign Artisan Dialog */}');
const dialogEnd = txt.lastIndexOf('    </Card>');

const listContent = txt.substring(listStart, listEnd);
const dialogContent = txt.substring(dialogStart, dialogEnd);

// Instead of manual string manipulation which might miss props, I will just extract the component into simpler parts,
// or I can extract the Dialog mapping into a separate component text.
console.log('listStart:', listStart, 'dialogStart:', dialogStart);
