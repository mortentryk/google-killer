import React from 'react';
import { Node } from '../types';
import { AnswerView } from './AnswerView';
import { DiscussionView } from './DiscussionView';

interface Props {
    node: Node;
    displayQuery: string;
    slug: string;
    cached?: boolean;
    generated?: boolean;
    aiReviewed?: boolean;
    focusDiscussion?: boolean;
}

export function AnswerDiscussionPanel({
    node,
    displayQuery,
    slug,
    cached,
    generated,
    aiReviewed,
    focusDiscussion,
}: Props) {
    return (
        <div className="max-w-[1400px] mx-auto w-full h-full min-h-0 flex flex-col lg:flex-row lg:items-stretch">
            <section className="flex-1 min-w-0 overflow-y-auto lg:border-r lg:border-[#ebebeb]">
                <AnswerView
                    node={node}
                    displayQuery={displayQuery}
                    slug={slug}
                    cached={cached}
                    generated={generated}
                    aiReviewed={aiReviewed}
                    embedded
                />
            </section>
            <aside className="w-full lg:w-[min(420px,40%)] shrink-0 overflow-y-auto bg-[#fafafa] lg:bg-white border-t lg:border-t-0 border-[#ebebeb]">
                <DiscussionView
                    nodeId={node.id}
                    nodeTitle={node.title}
                    embedded
                    focusDiscussion={focusDiscussion}
                />
            </aside>
        </div>
    );
}
