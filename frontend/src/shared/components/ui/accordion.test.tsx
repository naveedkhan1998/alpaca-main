import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from 'src/test/test-utils';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from './accordion';

describe('Accordion Component', () => {
  it('allows multiple items to be open with type="multiple"', () => {
    render(
      <Accordion type="multiple">
        <AccordionItem value="item-1">
          <AccordionTrigger>Trigger 1</AccordionTrigger>
          <AccordionContent>Content 1</AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger>Trigger 2</AccordionTrigger>
          <AccordionContent>Content 2</AccordionContent>
        </AccordionItem>
      </Accordion>
    );

    const trigger1 = screen.getByText('Trigger 1');
    const trigger2 = screen.getByText('Trigger 2');

    fireEvent.click(trigger1);
    fireEvent.click(trigger2);

    expect(screen.getByText('Content 1')).toBeVisible();
    expect(screen.getByText('Content 2')).toBeVisible();
  });

  it('accepts custom className', () => {
    render(
      <Accordion type="single" collapsible className="custom-accordion">
        <AccordionItem value="item-1" className="custom-item">
          <AccordionTrigger className="custom-trigger">
            Trigger
          </AccordionTrigger>
          <AccordionContent className="custom-content">
            Content
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    );

    expect(document.querySelector('.custom-accordion')).toBeInTheDocument();
    expect(document.querySelector('.custom-item')).toBeInTheDocument();
    expect(screen.getByText('Trigger')).toHaveClass('custom-trigger');
    // Note: Content is not visible initially, so we can't check its class directly
  });
});
