﻿namespace Storyteller.Core.Messages
{
    public class CancelSpec : ClientMessage
    {
        public CancelSpec() : base("cancel-spec")
        {
        }

        public string id;
    }
}