import { Stack, Box, Typography } from '@mui/material';
import { SectionLabel, ChoiceRow, facelift, StatusChip, Segmented, SearchField, ChoiceList } from '@/components/facelift';
import { initials } from './NewRepairFlowParts';

export function NewRepairFlowWho({ canSkipClient, clientId, clientLabel, clientPickerOpen, clientQuery, filteredClients, filteredStores, formData, handleStoreChange, isWholesale, onClearStorePreset, queryMatchesClient, setClientPickerOpen, setClientQuery, setFormData, setShowNewClientDialog, setStorePickerOpen, setStoreQuery, step, storePickerOpen, storePreset, storeQuery, users, wholesaleStores }) {
  return (
    <>
      {/* ── Step 1 — Who it's for ─────────────────────────────────────── */}
      {step === 0 && (
        <Stack spacing={2.5}>
          <Box>
            <SectionLabel>Account</SectionLabel>
            <Box sx={{ mt: 1.5 }}>
              {isWholesale ? (
                /* A wholesaler sees their own store, locked. An admin arriving with a store preset
                   ("Have another repair?" / a scanned tray) sees where it came from and can change it. */
                <ChoiceRow
                  lead={initials(formData.storeName)}
                  title={formData.storeName || 'My Wholesale Store'}
                  meta={storePreset ? 'Carried over from the last ticket' : 'Your store — fixed by your sign-in'}
                  trailing={storePreset && onClearStorePreset
                    /* ChoiceRow IS a button — the affordance is text, the row itself is the tap target. */
                    ? <Typography component="span" sx={{ color: facelift.gold, fontFamily: facelift.mono, fontSize: '0.6875rem', flexShrink: 0 }}>Change</Typography>
                    : <StatusChip label="Wholesale" hue="#7DD3FC" />}
                  selected
                  disabled={!storePreset}
                  aria-label={storePreset ? `Store ${formData.storeName || ''} — change store` : undefined}
                  onClick={storePreset && onClearStorePreset ? onClearStorePreset : undefined}
                  style={{ cursor: storePreset ? 'pointer' : 'default' }}
                />
              ) : (
                <Stack spacing={1.25}>
                  {/* The mock's Retail / Wholesale switcher. Retail IS Engel
                      Fine Design; Wholesale opens the store picker. */}
                  <Segmented
                    options={[
                      { value: 'retail', label: 'Retail' },
                      { value: 'wholesale', label: 'Wholesale' },
                    ]}
                    value={formData.isWholesale ? 'wholesale' : 'retail'}
                    onChange={(value) => {
                      if (value === 'retail') {
                        handleStoreChange('engel-fine-design');
                        setStorePickerOpen(false);
                        setStoreQuery('');
                      } else if (!formData.isWholesale) {
                        // No wholesale store chosen yet — open the picker.
                        setStorePickerOpen(true);
                      }
                    }}
                    aria-label="Account type"
                  />
                  {formData.isWholesale && !storePickerOpen && (
                    <ChoiceRow
                      lead={initials(formData.storeName)}
                      title={formData.storeName || 'Wholesale store'}
                      meta="Wholesale pricing · net terms"
                      trailing={<Typography component="span" sx={{ color: facelift.gold, fontWeight: 600, fontSize: '0.8125rem', flexShrink: 0 }}>Change</Typography>}
                      selected
                      aria-expanded={false}
                      onClick={() => setStorePickerOpen(true)}
                    />
                  )}
                  {storePickerOpen && (
                    <>
                      {wholesaleStores.length > 12 && (
                        <SearchField placeholder="Search stores…" value={storeQuery} onChange={(e) => setStoreQuery(e.target.value)} />
                      )}
                      <ChoiceList>
                        {filteredStores.map((store) => (
                          <ChoiceRow
                            key={store.id}
                            lead={initials(store.name)}
                            title={store.name}
                            meta="Wholesale pricing · net terms"
                            trailing={<StatusChip label="Wholesale" hue="#7DD3FC" />}
                            selected={String(store.id) === String(formData.storeId)}
                            onClick={() => { handleStoreChange(store.id); setStorePickerOpen(false); setStoreQuery(''); }}
                          />
                        ))}
                        {wholesaleStores.length === 0 && (
                          <Typography variant="caption" sx={{ color: facelift.text2 }}>
                            No wholesale accounts yet.
                          </Typography>
                        )}
                      </ChoiceList>
                    </>
                  )}
                </Stack>
              )}
            </Box>
          </Box>

          <Box>
            <SectionLabel>Client at this store</SectionLabel>
            <Stack spacing={1.25} sx={{ mt: 1.5 }}>
              {canSkipClient && formData.clientNotProvided && !clientPickerOpen ? (
                <ChoiceRow
                  lead="—"
                  title="No client given"
                  meta={`Billed to ${formData.storeName || 'the store'} — the shop never got a customer name`}
                  trailing={<Typography component="span" sx={{ color: facelift.gold, fontWeight: 600, fontSize: '0.8125rem', flexShrink: 0 }}>Add one</Typography>}
                  selected
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, clientNotProvided: false }));
                    setClientPickerOpen(true);
                    setClientQuery('');
                  }}
                />
              ) : formData.clientName && !clientPickerOpen ? (
                <ChoiceRow
                  lead={initials(formData.clientName)}
                  title={formData.clientName}
                  meta={(() => {
                    const rec = users.find((u) => formData.userID && clientId(u) === formData.userID);
                    return rec
                      ? [rec.phone || rec.phoneNumber, rec.email].filter(Boolean).join(' · ')
                      : 'Walk-in — no account yet';
                  })()}
                  trailing={<Typography component="span" sx={{ color: facelift.gold, fontWeight: 600, fontSize: '0.8125rem', flexShrink: 0 }}>Change</Typography>}
                  selected
                  aria-expanded={false}
                  onClick={() => { setClientPickerOpen(true); setClientQuery(''); }}
                />
              ) : (
                <>
                  <SearchField
                    placeholder="Name, phone, or email…"
                    value={clientQuery}
                    onChange={(e) => setClientQuery(e.target.value)}
                    autoFocus={clientPickerOpen}
                  />
                  {(filteredClients.length > 0 || clientQuery.trim()) && (
                    <ChoiceList>
                      {filteredClients.map((opt) => (
                        <ChoiceRow
                          key={clientId(opt) || clientLabel(opt)}
                          lead={initials(clientLabel(opt))}
                          title={clientLabel(opt)}
                          meta={[opt.phone || opt.phoneNumber, opt.email].filter(Boolean).join(' · ')}
                          selected={formData.userID ? clientId(opt) === formData.userID : clientLabel(opt) === formData.clientName}
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              clientName: clientLabel(opt),
                              userID: clientId(opt)
                            }));
                            setClientPickerOpen(false);
                            setClientQuery('');
                          }}
                        />
                      ))}
                      {!isWholesale && !formData.isWholesale && clientQuery.trim() && !queryMatchesClient && (
                        <ChoiceRow
                          lead="+"
                          title={`Use “${clientQuery.trim()}” as the client name`}
                          meta="Walk-in — no account yet"
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, clientName: clientQuery.trim(), userID: '' }));
                            setClientPickerOpen(false);
                            setClientQuery('');
                          }}
                        />
                      )}
                    </ChoiceList>
                  )}
                  <ChoiceList>
                    <ChoiceRow add title="New client at this store" onClick={() => setShowNewClientDialog(true)} />
                    {canSkipClient && (
                      <ChoiceRow
                        lead="—"
                        title="No client given — bill the store"
                        meta="For a tray the store drops off without customer names"
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, clientNotProvided: true, clientName: '', userID: '' }));
                          setClientPickerOpen(false);
                          setClientQuery('');
                        }}
                      />
                    )}
                  </ChoiceList>
                </>
              )}
            </Stack>
          </Box>
        </Stack>
      )}
    </>
  );
}
