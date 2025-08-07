import React from 'react';
import { ConditionalRule } from '../types';
import { RuleListItem } from './RuleListItem';
import { Sparkles } from 'lucide-react';

interface RuleListProps {
  rules: ConditionalRule[];
  selectedRuleId: string | null;
  onSelectRule: (ruleId: string) => void;
  onDeleteRule: (ruleId: string) => void;
  onDuplicateRule: (ruleId: string) => void;
  onMoveRule: (ruleId: string, direction: 'up' | 'down') => void;
  onToggleRule: (ruleId: string) => void;
}

export const RuleList: React.FC<RuleListProps> = ({
  rules,
  selectedRuleId,
  onSelectRule,
  onDeleteRule,
  onDuplicateRule,
  onMoveRule,
  onToggleRule
}) => {
  if (rules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-muted/30 flex items-center justify-center mb-3">
          <Sparkles className="h-7 w-7 text-muted-foreground/30" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">No rules defined</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Click "Add Rule" to create your first rule</p>
      </div>
    );
  }

  return (
    <div className="p-2">
      <div className="space-y-1">
        {rules.map((rule, index) => (
          <RuleListItem
            key={rule.id}
            rule={rule}
            index={index}
            totalRules={rules.length}
            isSelected={selectedRuleId === rule.id}
            onSelect={() => onSelectRule(rule.id)}
            onDelete={() => onDeleteRule(rule.id)}
            onDuplicate={() => onDuplicateRule(rule.id)}
            onMoveUp={() => onMoveRule(rule.id, 'up')}
            onMoveDown={() => onMoveRule(rule.id, 'down')}
            onToggle={() => onToggleRule(rule.id)}
          />
        ))}
      </div>
    </div>
  );
};