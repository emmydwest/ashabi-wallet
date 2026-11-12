// The payment flow's layout, shared by the drawing and the labels set underneath it.
export const FLOW = {
  AGENT_X: 100,
  CONTRACT_X: 300,
  PAYEE_X: 500,
  RAIL_Y: 104,
  VIEW: { x: 20, y: -16, w: 560, h: 200 },
} as const;

const across = (x: number) => (x - FLOW.VIEW.x) / FLOW.VIEW.w;

/** Where each node's centre falls across the drawing, as a share of its width. */
export const FLOW_NODES = {
  agent: across(FLOW.AGENT_X),
  contract: across(FLOW.CONTRACT_X),
  payee: across(FLOW.PAYEE_X),
};
