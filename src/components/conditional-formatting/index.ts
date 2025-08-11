export { ConditionalFormattingDialog } from './ConditionalFormattingDialog';
export type { 
  ConditionalRule, 
  ConditionalRuleTemplate,
  ConditionalFormattingDialogProps 
} from './types';
export * from './utils/ruleUtils';
export { evaluateExpression, validateConditionalExpression } from './utils/expressionEvaluator';