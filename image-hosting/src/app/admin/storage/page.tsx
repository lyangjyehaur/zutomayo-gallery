"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function StorageStrategiesPage() {
  const [strategies, setStrategies] = useState([
    { id: 1, name: "Local Fast", type: "local", endpoint: "/uploads" },
    { id: 2, name: "S3 Primary", type: "s3", endpoint: "s3.aws.com/bucket" },
    { id: 3, name: "Cloudflare R2", type: "r2", endpoint: "r2.cloudflare.com/bucket" },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Storage Strategies</h1>
        
        <Dialog>
          <DialogTrigger render={<Button />}>
            <Plus className="mr-2 h-4 w-4" />
            Add Strategy
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Storage Strategy</DialogTitle>
              <DialogDescription>
                Configure a new storage backend for uploading images.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Name</Label>
                <Input id="name" placeholder="e.g. Backblaze B2" className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="type" className="text-right">Type</Label>
                <Input id="type" placeholder="s3, r2, local, etc." className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="endpoint" className="text-right">Endpoint</Label>
                <Input id="endpoint" placeholder="https://..." className="col-span-3" />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Configured Strategies</CardTitle>
          <CardDescription>
            Manage the active storage endpoints that can be assigned to role groups.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Endpoint</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {strategies.map((strategy) => (
                <TableRow key={strategy.id}>
                  <TableCell>{strategy.id}</TableCell>
                  <TableCell className="font-medium">{strategy.name}</TableCell>
                  <TableCell className="uppercase">{strategy.type}</TableCell>
                  <TableCell>{strategy.endpoint}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}