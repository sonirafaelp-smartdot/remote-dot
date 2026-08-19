import { Router, Request, Response } from 'express';
import { db } from '../database/db.ts';
import { Customer } from '../database/entities.ts';

export const customersRouter = Router();

// GET /api/v1/customers
customersRouter.get('/', (req: Request, res: Response) => {
  const search = (req.query.search as string || '').toLowerCase();
  
  let list = Array.from(db.customers.values()).map((c) => {
    // Count associated devices and tickets
    const customerDevices = Array.from(db.devices.values()).filter((d) => d.customer_id === c.id);
    const totalDevices = customerDevices.length;
    const onlineDevices = customerDevices.filter((d) => d.is_online).length;
    const totalTickets = Array.from(db.tickets.values()).filter((t) => t.customer_id === c.id).length;

    return {
      ...c,
      total_devices: totalDevices,
      online_devices: onlineDevices,
      total_tickets: totalTickets,
      enrollment_token: `ENROLL-${c.id.toUpperCase()}-SECURE`,
    };
  });

  if (search) {
    list = list.filter(
      (c) =>
        c.company_name.toLowerCase().includes(search) ||
        c.contact_name.toLowerCase().includes(search) ||
        c.email.toLowerCase().includes(search) ||
        c.phone.includes(search)
    );
  }

  res.json(list);
});

// GET /api/v1/customers/:id
customersRouter.get('/:id', (req: Request, res: Response) => {
  const customer = db.customers.get(req.params.id);
  if (!customer) {
    return res.status(404).json({ error: 'Cliente no encontrado' });
  }

  const customerDevices = Array.from(db.devices.values()).filter((d) => d.customer_id === customer.id);
  const customerTickets = Array.from(db.tickets.values())
    .filter((t) => t.customer_id === customer.id)
    .map((t) => db.getHydratedTicket(t));

  res.json({
    ...customer,
    enrollment_token: `ENROLL-${customer.id.toUpperCase()}-SECURE`,
    devices: customerDevices,
    tickets: customerTickets,
  });
});

// POST /api/v1/customers
customersRouter.post('/', (req: Request, res: Response) => {
  const { company_name, contact_name, phone, email, address } = req.body;

  if (!company_name || !contact_name || !email) {
    return res.status(400).json({ error: 'company_name, contact_name y email son campos requeridos' });
  }

  // Check email uniqueness among customers
  const existing = Array.from(db.customers.values()).find(
    (c) => c.email.toLowerCase() === email.toLowerCase()
  );
  if (existing) {
    return res.status(400).json({ error: 'Ya existe una empresa registrada con ese correo electrónico' });
  }

  const id = `cust-${Date.now()}`;
  const newCustomer: Customer = {
    id,
    company_name,
    contact_name,
    phone: phone || '',
    email,
    address: address || '',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.customers.set(id, newCustomer);
  db.logAudit(undefined, 'CUSTOMER_CREATED', 'Customer', id, { company_name, email });

  res.status(201).json({
    ...newCustomer,
    enrollment_token: `ENROLL-${newCustomer.id.toUpperCase()}-SECURE`,
    total_devices: 0,
    online_devices: 0,
  });
});

// PUT /api/v1/customers/:id
customersRouter.put('/:id', (req: Request, res: Response) => {
  const customer = db.customers.get(req.params.id);
  if (!customer) {
    return res.status(404).json({ error: 'Cliente no encontrado' });
  }

  const { company_name, contact_name, phone, email, address, is_active } = req.body;

  if (company_name) customer.company_name = company_name;
  if (contact_name) customer.contact_name = contact_name;
  if (phone !== undefined) customer.phone = phone;
  if (email) customer.email = email;
  if (address !== undefined) customer.address = address;
  if (is_active !== undefined) customer.is_active = is_active;
  customer.updated_at = new Date().toISOString();

  db.logAudit(undefined, 'CUSTOMER_UPDATED', 'Customer', customer.id, { company_name: customer.company_name });

  res.json({
    ...customer,
    enrollment_token: `ENROLL-${customer.id.toUpperCase()}-SECURE`,
  });
});

// DELETE /api/v1/customers/:id
customersRouter.delete('/:id', (req: Request, res: Response) => {
  const customer = db.customers.get(req.params.id);
  if (!customer) {
    return res.status(404).json({ error: 'Cliente no encontrado' });
  }

  // Count devices
  const linkedDevices = Array.from(db.devices.values()).filter((d) => d.customer_id === customer.id);
  if (linkedDevices.length > 0) {
    return res.status(400).json({
      error: `No se puede eliminar la empresa porque tiene ${linkedDevices.length} computadoras enroladas. Desvincula o elimina los equipos primero.`,
    });
  }

  db.customers.delete(customer.id);
  db.logAudit(undefined, 'CUSTOMER_DELETED', 'Customer', customer.id, { company_name: customer.company_name });

  res.json({ message: `Empresa ${customer.company_name} eliminada exitosamente.` });
});
