package com.breeze.backend.service;

import com.breeze.backend.dto.InstrumentDto;
import com.breeze.backend.dto.SubscribedInstrumentDto;

import java.util.List;

public interface SubscribedInstrumentsService {
    List<SubscribedInstrumentDto> getSubscribedInstruments();
    SubscribedInstrumentDto subscribeInstrument(Long instrumentId, int duration);
    void unsubscribeInstrument(Long id);
}
