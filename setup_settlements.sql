-- Create settlement_requests table for multi-party handshake
CREATE TABLE IF NOT EXISTS public.settlement_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    initiator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_phone TEXT NOT NULL, -- We use phone because receiver might not be registered yet
    amount NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending' or 'completed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.settlement_requests ENABLE ROW LEVEL SECURITY;

-- Policies
-- Initiator can see and create their own requests
CREATE POLICY "Users can create settlement requests"
    ON public.settlement_requests FOR INSERT
    WITH CHECK (auth.uid() = initiator_id);

CREATE POLICY "Initiator can view their requests"
    ON public.settlement_requests FOR SELECT
    USING (auth.uid() = initiator_id);

-- Receiver can view and update requests directed at their phone number
CREATE POLICY "Receiver can view requests via phone"
    ON public.settlement_requests FOR SELECT
    USING (
        receiver_phone = (SELECT phone FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Receiver can update requests"
    ON public.settlement_requests FOR UPDATE
    USING (
        receiver_phone = (SELECT phone FROM public.profiles WHERE id = auth.uid())
    );
