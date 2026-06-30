import type { DinkyDataV2 } from './dinky-api'

/**
 * Welcome space template for new users
 * Explains all UI interactions and features
 */
export const welcomeSpace: Omit<DinkyDataV2, 'id' | 'userId'> = {
  version: 2,
  kind: 'space',
  lastSequence: 0,
  title: 'Welcome to SpaceNotes',
  backgroundColor: '#f8fafc',
  nodes: [
    // Title card
    {
      id: 'welcome',
      type: 'text',
      x: 400,
      y: 50,
      width: 350,
      height: 120,
      color: '#3B82F6',
      content: '<h1>Welcome to SpaceNotes!</h1><p>A collaborative canvas for visual thinking. Drag, connect, and organize your ideas.</p>',
    },

    // === CREATING CARDS ===
    {
      id: 'section-create',
      type: 'text',
      x: 50,
      y: 220,
      width: 200,
      height: 50,
      color: '#8B5CF6',
      content: '<b>Creating Cards</b>',
    },
    {
      id: 'create-dblclick',
      type: 'text',
      x: 50,
      y: 290,
      width: 200,
      content: '<b>Double-click</b> anywhere on the canvas to create a new card',
    },
    {
      id: 'create-type',
      type: 'text',
      x: 50,
      y: 400,
      width: 200,
      content: 'New empty cards auto-focus so you can <b>start typing immediately</b>',
    },

    // === EDITING CARDS ===
    {
      id: 'section-edit',
      type: 'text',
      x: 300,
      y: 220,
      width: 200,
      height: 50,
      color: '#EC4899',
      content: '<b>Editing Cards</b>',
    },
    {
      id: 'edit-click',
      type: 'text',
      x: 300,
      y: 290,
      width: 200,
      content: '<b>Click</b> on a card to select it',
    },
    {
      id: 'edit-type',
      type: 'text',
      x: 300,
      y: 400,
      width: 200,
      content: '<b>Double-click</b> or just start typing to edit the text',
    },
    {
      id: 'edit-drag',
      type: 'text',
      x: 300,
      y: 510,
      width: 200,
      content: '<b>Drag</b> cards to move them around the canvas',
    },

    // === CONNECTIONS ===
    {
      id: 'section-connect',
      type: 'text',
      x: 550,
      y: 220,
      width: 200,
      height: 50,
      color: '#22C55E',
      content: '<b>Connecting Cards</b>',
    },
    {
      id: 'connect-start',
      type: 'text',
      x: 550,
      y: 290,
      width: 200,
      content: 'Click the <b>connector dot</b> on a card to start a connection',
    },
    {
      id: 'connect-end',
      type: 'text',
      x: 550,
      y: 400,
      width: 200,
      content: 'Then click another card to <b>complete the connection</b>',
    },
    {
      id: 'connect-new',
      type: 'text',
      x: 550,
      y: 510,
      width: 200,
      content: 'Or click empty space to <b>create a connected card</b>',
    },
    {
      id: 'connect-delete',
      type: 'text',
      x: 550,
      y: 620,
      width: 200,
      content: '<b>Click a line</b> to remove the connection',
    },

    // === SELECTION & DELETE ===
    {
      id: 'section-select',
      type: 'text',
      x: 800,
      y: 220,
      width: 200,
      height: 50,
      color: '#F97316',
      content: '<b>Selection & Delete</b>',
    },
    {
      id: 'select-box',
      type: 'text',
      x: 800,
      y: 290,
      width: 200,
      content: '<b>Drag on canvas</b> to draw a selection box around multiple cards',
    },
    {
      id: 'select-move',
      type: 'text',
      x: 800,
      y: 400,
      width: 200,
      content: 'Move one selected card to <b>move all selected</b> together',
    },
    {
      id: 'select-delete',
      type: 'text',
      x: 800,
      y: 510,
      width: 200,
      content: 'Press <b>Escape</b> or <b>Delete</b> key to delete selected cards',
    },

    // === STYLING ===
    {
      id: 'section-style',
      type: 'text',
      x: 50,
      y: 550,
      width: 200,
      height: 50,
      color: '#EAB308',
      content: '<b>Styling</b>',
    },
    {
      id: 'style-color',
      type: 'text',
      x: 50,
      y: 620,
      width: 200,
      content: 'Use the <b>color picker</b> on cards to change their color',
    },
    {
      id: 'style-resize',
      type: 'text',
      x: 50,
      y: 730,
      width: 200,
      content: '<b>Drag the corner</b> of a card to resize it. Double-click to reset.',
    },
    {
      id: 'style-bg',
      type: 'text',
      x: 50,
      y: 840,
      width: 200,
      content: 'Change the <b>canvas background</b> with the color picker at bottom-left',
    },

    // === COLLABORATION ===
    {
      id: 'section-collab',
      type: 'text',
      x: 300,
      y: 680,
      width: 450,
      height: 50,
      color: '#14B8A6',
      content: '<b>Sharing & Collaboration</b>',
    },
    {
      id: 'collab-share',
      type: 'text',
      x: 300,
      y: 750,
      width: 220,
      content: 'Click the <b>Share button</b> to copy a link to this space',
    },
    {
      id: 'collab-invite',
      type: 'text',
      x: 530,
      y: 750,
      width: 220,
      content: 'Use <b>Invite</b> in the sidebar to create a collaboration link with edit access',
    },
    {
      id: 'collab-realtime',
      type: 'text',
      x: 300,
      y: 860,
      width: 220,
      content: 'Invited collaborators see <b>live cursors</b> and changes in real-time',
    },
    {
      id: 'collab-lock',
      type: 'text',
      x: 530,
      y: 860,
      width: 220,
      content: 'Without an invite link, visitors can only <b>view</b> (locked mode)',
    },

    // === AUTH ===
    {
      id: 'section-auth',
      type: 'text',
      x: 800,
      y: 680,
      width: 200,
      height: 50,
      color: '#EF4444',
      content: '<b>Saving Your Work</b>',
    },
    {
      id: 'auth-signin',
      type: 'text',
      x: 800,
      y: 750,
      width: 200,
      content: '<b>Sign in</b> to save spaces to your account',
    },
    {
      id: 'auth-fork',
      type: 'text',
      x: 800,
      y: 860,
      width: 200,
      content: 'Use <b>Fork</b> to copy someone else\'s space to your account',
    },

    // Tip card
    {
      id: 'tip',
      type: 'text',
      x: 400,
      y: 1000,
      width: 350,
      height: 80,
      color: '#f0f9ff',
      content: '<b>Tip:</b> Links in cards are clickable! Try adding URLs to your notes.',
    },
  ],
  edges: [
    // Welcome to sections
    { id: 'e1', fromNode: 'welcome', toNode: 'section-create', color: '#8B5CF6' },
    { id: 'e2', fromNode: 'welcome', toNode: 'section-edit', color: '#EC4899' },
    { id: 'e3', fromNode: 'welcome', toNode: 'section-connect', color: '#22C55E' },
    { id: 'e4', fromNode: 'welcome', toNode: 'section-select', color: '#F97316' },

    // Create section
    { id: 'e5', fromNode: 'section-create', toNode: 'create-dblclick', color: '#c4b5fd' },
    { id: 'e6', fromNode: 'create-dblclick', toNode: 'create-type', color: '#c4b5fd' },

    // Edit section
    { id: 'e7', fromNode: 'section-edit', toNode: 'edit-click', color: '#f9a8d4' },
    { id: 'e8', fromNode: 'edit-click', toNode: 'edit-type', color: '#f9a8d4' },
    { id: 'e9', fromNode: 'edit-type', toNode: 'edit-drag', color: '#f9a8d4' },

    // Connect section
    { id: 'e10', fromNode: 'section-connect', toNode: 'connect-start', color: '#86efac' },
    { id: 'e11', fromNode: 'connect-start', toNode: 'connect-end', color: '#86efac' },
    { id: 'e12', fromNode: 'connect-end', toNode: 'connect-new', color: '#86efac' },
    { id: 'e13', fromNode: 'connect-new', toNode: 'connect-delete', color: '#86efac' },

    // Select section
    { id: 'e14', fromNode: 'section-select', toNode: 'select-box', color: '#fdba74' },
    { id: 'e15', fromNode: 'select-box', toNode: 'select-move', color: '#fdba74' },
    { id: 'e16', fromNode: 'select-move', toNode: 'select-delete', color: '#fdba74' },

    // Style section
    { id: 'e17', fromNode: 'section-style', toNode: 'style-color', color: '#fde047' },
    { id: 'e18', fromNode: 'style-color', toNode: 'style-resize', color: '#fde047' },
    { id: 'e19', fromNode: 'style-resize', toNode: 'style-bg', color: '#fde047' },

    // Collab section
    { id: 'e20', fromNode: 'section-collab', toNode: 'collab-share', color: '#5eead4' },
    { id: 'e21', fromNode: 'section-collab', toNode: 'collab-invite', color: '#5eead4' },
    { id: 'e22', fromNode: 'collab-share', toNode: 'collab-realtime', color: '#5eead4' },
    { id: 'e23', fromNode: 'collab-invite', toNode: 'collab-lock', color: '#5eead4' },

    // Auth section
    { id: 'e24', fromNode: 'section-auth', toNode: 'auth-signin', color: '#fca5a5' },
    { id: 'e25', fromNode: 'auth-signin', toNode: 'auth-fork', color: '#fca5a5' },

    // Cross-links
    { id: 'e26', fromNode: 'collab-lock', toNode: 'auth-fork', color: '#94a3b8' },
    { id: 'e27', fromNode: 'style-bg', toNode: 'section-collab', color: '#94a3b8' },
  ],
}
